from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from passlib.context import CryptContext
from jose import JWTError, jwt
import razorpay

from models.user import UserCreate, UserLogin, User, UserResponse, TokenResponse, Address
from models.menu import MenuItem, MenuItemCreate, Category
from models.order import Order, OrderCreate, OrderStatusUpdate, AssignRider, OrderItem
from models.review import Review, ReviewCreate
from models.coupon import Coupon, CouponCreate

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'vdc_secret_key')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '720'))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.getenv('RAZORPAY_KEY_ID'),
    os.getenv('RAZORPAY_KEY_SECRET')
))

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
users_collection = db.users
menu_collection = db.menu_items
categories_collection = db.categories
orders_collection = db.orders
reviews_collection = db.reviews
coupons_collection = db.coupons

# Create the main app
app = FastAPI(title="VDC Restro API")

# Create API router
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await users_collection.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# ==================== Auth Routes ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_dict = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "firebase_uid": user_data.firebase_uid,
        "password": hashed_password,
        "addresses": [],
        "created_at": datetime.utcnow(),
        "is_active": True,
        "profile_image": None
    }
    
    await users_collection.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id, "role": user_data.role})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone,
            role=user_data.role,
            addresses=[]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await users_collection.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            phone=user.get("phone"),
            role=user["role"],
            addresses=user.get("addresses", []),
            profile_image=user.get("profile_image")
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        addresses=current_user.get("addresses", []),
        profile_image=current_user.get("profile_image")
    )

# ==================== Menu Routes ====================

@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu(category: Optional[str] = None, search: Optional[str] = None):
    query = {"is_available": True}
    if category:
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    items = await menu_collection.find(query).to_list(1000)
    return [MenuItem(**item) for item in items]

@api_router.get("/menu/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    item = await menu_collection.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItem(**item)

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    cats = await categories_collection.find({"is_active": True}).sort("order", 1).to_list(100)
    return [Category(**cat) for cat in cats]

# ==================== Admin Menu Management ====================

@api_router.post("/admin/menu", response_model=MenuItem)
async def create_menu_item(
    item: MenuItemCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    item_id = str(uuid.uuid4())
    item_dict = item.model_dump()
    item_dict.update({
        "id": item_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    await menu_collection.insert_one(item_dict)
    return MenuItem(**item_dict)

@api_router.put("/admin/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(
    item_id: str,
    item: MenuItemCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    existing = await menu_collection.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item_dict = item.model_dump()
    item_dict["updated_at"] = datetime.utcnow()
    
    await menu_collection.update_one({"id": item_id}, {"$set": item_dict})
    
    updated = await menu_collection.find_one({"id": item_id})
    return MenuItem(**updated)

@api_router.delete("/admin/menu/{item_id}")
async def delete_menu_item(
    item_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    result = await menu_collection.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Item deleted successfully"}

# ==================== Order Routes ====================

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    # Calculate totals
    subtotal = sum(item.price * item.quantity for item in order_data.items)
    delivery_fee = 30.0 if subtotal < 300 else 0
    tax = subtotal * 0.05  # 5% tax
    discount = 0
    
    # Apply coupon if provided
    if order_data.coupon_code:
        coupon = await coupons_collection.find_one({
            "code": order_data.coupon_code,
            "is_active": True
        })
        if coupon and datetime.utcnow() >= coupon["valid_from"] and datetime.utcnow() <= coupon["valid_until"]:
            if subtotal >= coupon["min_order_value"]:
                if coupon["discount_type"] == "percentage":
                    discount = subtotal * (coupon["discount_value"] / 100)
                    if coupon.get("max_discount"):
                        discount = min(discount, coupon["max_discount"])
                else:
                    discount = coupon["discount_value"]
    
    total = subtotal + delivery_fee + tax - discount
    
    order_id = str(uuid.uuid4())
    order_number = f"VDC{datetime.utcnow().strftime('%Y%m%d')}{str(uuid.uuid4())[:4].upper()}"
    
    order_dict = {
        "id": order_id,
        "order_number": order_number,
        "customer_id": current_user["id"],
        "customer_name": current_user["name"],
        "customer_phone": current_user.get("phone", ""),
        "items": [item.model_dump() for item in order_data.items],
        "delivery_address": order_data.delivery_address,
        "payment_method": order_data.payment_method,
        "coupon_code": order_data.coupon_code,
        "subtotal": subtotal,
        "discount": discount,
        "delivery_fee": delivery_fee,
        "tax": tax,
        "total": total,
        "status": "pending",
        "payment_status": "pending" if order_data.payment_method == "online" else "completed",
        "payment_id": None,
        "assigned_rider_id": None,
        "assigned_rider_name": None,
        "estimated_delivery_time": datetime.utcnow() + timedelta(minutes=45),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "delivered_at": None
    }
    
    await orders_collection.insert_one(order_dict)
    return Order(**order_dict)

@api_router.get("/orders", response_model=List[Order])
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "customer":
        orders = await orders_collection.find({"customer_id": current_user["id"]}).sort("created_at", -1).to_list(1000)
    elif current_user["role"] in ["staff", "admin"]:
        orders = await orders_collection.find({}).sort("created_at", -1).to_list(1000)
    elif current_user["role"] == "rider":
        orders = await orders_collection.find({
            "$or": [
                {"assigned_rider_id": current_user["id"]},
                {"status": "ready", "assigned_rider_id": None}
            ]
        }).sort("created_at", -1).to_list(1000)
    else:
        orders = []
    
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await orders_collection.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    if current_user["role"] == "customer" and order["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    return Order(**order)

@api_router.patch("/orders/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(require_role(["staff", "admin", "rider"]))
):
    order = await orders_collection.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.utcnow()
    }
    
    if status_update.status == "delivered":
        update_data["delivered_at"] = datetime.utcnow()
        update_data["payment_status"] = "completed"
    
    await orders_collection.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await orders_collection.find_one({"id": order_id})
    return Order(**updated_order)

@api_router.post("/orders/{order_id}/assign-rider", response_model=Order)
async def assign_rider_to_order(
    order_id: str,
    assignment: AssignRider,
    current_user: dict = Depends(require_role(["admin", "staff"]))
):
    order = await orders_collection.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    rider = await users_collection.find_one({"id": assignment.rider_id, "role": "rider"})
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    
    await orders_collection.update_one(
        {"id": order_id},
        {"$set": {
            "assigned_rider_id": assignment.rider_id,
            "assigned_rider_name": rider["name"],
            "status": "out_for_delivery",
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_order = await orders_collection.find_one({"id": order_id})
    return Order(**updated_order)

# ==================== Payment Routes ====================

@api_router.post("/payment/create-order")
async def create_payment_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    order = await orders_collection.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create Razorpay order
    razorpay_order = razorpay_client.order.create({
        "amount": int(order["total"] * 100),  # Amount in paise
        "currency": "INR",
        "receipt": order["order_number"]
    })
    
    return {
        "order_id": razorpay_order["id"],
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"]
    }

@api_router.post("/payment/verify")
async def verify_payment(
    payment_data: dict,
    current_user: dict = Depends(get_current_user)
):
    # Verify payment signature
    try:
        razorpay_client.utility.verify_payment_signature(payment_data)
        
        # Update order payment status
        await orders_collection.update_one(
            {"order_number": payment_data.get("receipt")},
            {"$set": {
                "payment_status": "completed",
                "payment_id": payment_data.get("razorpay_payment_id"),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
    except:
        raise HTTPException(status_code=400, detail="Payment verification failed")

# ==================== Reviews ====================

@api_router.post("/reviews", response_model=Review)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if order exists and belongs to user
    order = await orders_collection.find_one({"id": review_data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if review already exists
    existing_review = await reviews_collection.find_one({
        "order_id": review_data.order_id,
        "customer_id": current_user["id"]
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Review already submitted for this order")
    
    review_id = str(uuid.uuid4())
    review_dict = review_data.model_dump()
    review_dict.update({
        "id": review_id,
        "customer_id": current_user["id"],
        "customer_name": current_user["name"],
        "created_at": datetime.utcnow()
    })
    
    await reviews_collection.insert_one(review_dict)
    return Review(**review_dict)

@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await reviews_collection.find({}).sort("created_at", -1).limit(50).to_list(50)
    return [Review(**review) for review in reviews]

# ==================== Coupons ====================

@api_router.post("/admin/coupons", response_model=Coupon)
async def create_coupon(
    coupon_data: CouponCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    # Check if code exists
    existing = await coupons_collection.find_one({"code": coupon_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_id = str(uuid.uuid4())
    coupon_dict = coupon_data.model_dump()
    coupon_dict.update({
        "id": coupon_id,
        "usage_count": 0,
        "created_at": datetime.utcnow()
    })
    
    await coupons_collection.insert_one(coupon_dict)
    return Coupon(**coupon_dict)

@api_router.get("/coupons", response_model=List[Coupon])
async def get_coupons(current_user: dict = Depends(get_current_user)):
    query = {"is_active": True}
    if current_user["role"] != "admin":
        query["valid_until"] = {"$gte": datetime.utcnow()}
    
    coupons = await coupons_collection.find(query).to_list(100)
    return [Coupon(**coupon) for coupon in coupons]

@api_router.post("/coupons/validate/{code}")
async def validate_coupon(
    code: str,
    order_amount: float,
    current_user: dict = Depends(get_current_user)
):
    coupon = await coupons_collection.find_one({"code": code, "is_active": True})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    now = datetime.utcnow()
    if now < coupon["valid_from"] or now > coupon["valid_until"]:
        raise HTTPException(status_code=400, detail="Coupon expired or not yet valid")
    
    if order_amount < coupon["min_order_value"]:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order value of ₹{coupon['min_order_value']} required"
        )
    
    if coupon.get("usage_limit") and coupon["usage_count"] >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Calculate discount
    if coupon["discount_type"] == "percentage":
        discount = order_amount * (coupon["discount_value"] / 100)
        if coupon.get("max_discount"):
            discount = min(discount, coupon["max_discount"])
    else:
        discount = coupon["discount_value"]
    
    return {
        "valid": True,
        "discount": discount,
        "description": coupon["description"]
    }

# ==================== User Management ====================

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(
    role: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    query = {}
    if role:
        query["role"] = role
    
    users = await users_collection.find(query).to_list(1000)
    return [UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        role=user["role"],
        addresses=user.get("addresses", [])
    ) for user in users]

@api_router.put("/users/profile", response_model=UserResponse)
async def update_profile(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    profile_image: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    if name:
        update_data["name"] = name
    if phone:
        update_data["phone"] = phone
    if profile_image:
        update_data["profile_image"] = profile_image
    
    if update_data:
        await users_collection.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    
    updated_user = await users_collection.find_one({"id": current_user["id"]})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        phone=updated_user.get("phone"),
        role=updated_user["role"],
        addresses=updated_user.get("addresses", []),
        profile_image=updated_user.get("profile_image")
    )

@api_router.post("/users/addresses", response_model=UserResponse)
async def add_address(
    address: Address,
    current_user: dict = Depends(get_current_user)
):
    address_dict = address.model_dump()
    
    # If this is set as default, unset other defaults
    if address.is_default:
        current_addresses = current_user.get("addresses", [])
        for addr in current_addresses:
            addr["is_default"] = False
        await users_collection.update_one(
            {"id": current_user["id"]},
            {"$set": {"addresses": current_addresses}}
        )
    
    await users_collection.update_one(
        {"id": current_user["id"]},
        {"$push": {"addresses": address_dict}}
    )
    
    updated_user = await users_collection.find_one({"id": current_user["id"]})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        phone=updated_user.get("phone"),
        role=updated_user["role"],
        addresses=updated_user.get("addresses", [])
    )

# ==================== Analytics ====================

@api_router.get("/admin/analytics")
async def get_analytics(
    current_user: dict = Depends(require_role(["admin"]))
):
    # Total orders
    total_orders = await orders_collection.count_documents({})
    
    # Total revenue
    pipeline = [
        {"$match": {"payment_status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await orders_collection.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Orders by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    orders_by_status = await orders_collection.aggregate(status_pipeline).to_list(10)
    
    # Total users by role
    users_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    users_by_role = await users_collection.aggregate(users_pipeline).to_list(10)
    
    # Recent orders (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_orders = await orders_collection.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "orders_by_status": {item["_id"]: item["count"] for item in orders_by_status},
        "users_by_role": {item["_id"]: item["count"] for item in users_by_role},
        "recent_orders": recent_orders
    }

# ==================== Database Seeding ====================

@api_router.post("/admin/seed-database")
async def seed_database():
    """Seed the database with initial data"""
    
    # Clear existing data
    await users_collection.delete_many({})
    await menu_collection.delete_many({})
    await categories_collection.delete_many({})
    await coupons_collection.delete_many({})
    
    # Create default users
    default_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@vdcrestro.com",
            "password": hash_password("Admin@123"),
            "name": "Admin User",
            "phone": "+91 9315155657",
            "role": "admin",
            "addresses": [],
            "created_at": datetime.utcnow(),
            "is_active": True,
            "firebase_uid": None,
            "profile_image": None
        },
        {
            "id": str(uuid.uuid4()),
            "email": "staff@vdcrestro.com",
            "password": hash_password("Staff@123"),
            "name": "Staff User",
            "phone": "+91 9315156407",
            "role": "staff",
            "addresses": [],
            "created_at": datetime.utcnow(),
            "is_active": True,
            "firebase_uid": None,
            "profile_image": None
        },
        {
            "id": str(uuid.uuid4()),
            "email": "rider@vdcrestro.com",
            "password": hash_password("Rider@123"),
            "name": "Rider User",
            "phone": "+91 9999999999",
            "role": "rider",
            "addresses": [],
            "created_at": datetime.utcnow(),
            "is_active": True,
            "firebase_uid": None,
            "profile_image": None
        },
        {
            "id": str(uuid.uuid4()),
            "email": "customer@vdcrestro.com",
            "password": hash_password("Customer@123"),
            "name": "Test Customer",
            "phone": "+91 8888888888",
            "role": "customer",
            "addresses": [
                {
                    "label": "Home",
                    "address_line1": "123 Main Street",
                    "address_line2": "Near City Mall",
                    "city": "Delhi",
                    "state": "Delhi",
                    "pincode": "110001",
                    "landmark": "Opposite Metro Station",
                    "is_default": True
                }
            ],
            "created_at": datetime.utcnow(),
            "is_active": True,
            "firebase_uid": None,
            "profile_image": None
        }
    ]
    
    await users_collection.insert_many(default_users)
    
    # Create categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Special VDC Menu", "description": "Restaurant specials", "order": 1, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Snacks & Starters", "description": "Appetizers and starters", "order": 2, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Soup", "description": "Hot soups", "order": 3, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Chinese", "description": "Chinese delicacies", "order": 4, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Momos", "description": "Steamed and fried momos", "order": 5, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Main Course", "description": "Main dishes", "order": 6, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Tandoori Bread", "description": "Fresh from tandoor", "order": 7, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Rice", "description": "Rice preparations", "order": 8, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Thali", "description": "Complete meals", "order": 9, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Combo Menu", "description": "Value combos", "order": 10, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Accompaniments", "description": "Extras and sides", "order": 11, "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Beverages", "description": "Drinks and refreshments", "order": 12, "is_active": True},
    ]
    
    await categories_collection.insert_many(categories)
    
    # Create comprehensive menu from uploaded images
    menu_items = [
        # Special VDC Menu
        {"id": str(uuid.uuid4()), "name": "Crispy Corn", "category": "Special VDC Menu", "price_half": 149, "price_full": 259, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kurkure Chilli Potato", "category": "Special VDC Menu", "price_half": 100, "price_full": 170, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kurkure Chilli Momos", "category": "Special VDC Menu", "price_half": 120, "price_full": 199, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Mushroom", "category": "Special VDC Menu", "price_half": 139, "price_full": 259, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Mushroom Duplex", "category": "Special VDC Menu", "price_half": 149, "price_full": 269, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "KFC Paneer", "category": "Special VDC Menu", "price_half": 149, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dahi Ke Shole", "category": "Special VDC Menu", "price_half": 149, "price_full": 299, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dahi Kabab", "category": "Special VDC Menu", "price_half": 149, "price_full": 280, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Peri Peri Chap", "category": "Special VDC Menu", "price_half": 160, "price_full": 299, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Makhmali Chap", "category": "Special VDC Menu", "price_half": 179, "price_full": 299, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Malai Kopta", "category": "Special VDC Menu", "price_half": 279, "price_full": 399, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Methi Malai", "category": "Special VDC Menu", "price_half": 289, "price_full": 419, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kadhai Paneer", "category": "Special VDC Menu", "price_half": 219, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kadhai Soya Chap", "category": "Special VDC Menu", "price_half": 199, "price_full": 319, "is_vegetarian": True, "is_available": True},
        
        # Soup
        {"id": str(uuid.uuid4()), "name": "Tomato Soup", "category": "Soup", "price_full": 59, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Man Chow Soup", "category": "Soup", "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Hot & Sour Soup", "category": "Soup", "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Clear Soup", "category": "Soup", "price_full": 69, "is_vegetarian": True, "is_available": True},
        
        # Chinese
        {"id": str(uuid.uuid4()), "name": "French Fries", "category": "Chinese", "price_half": 50, "price_full": 80, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Potato", "category": "Chinese", "price_half": 60, "price_full": 100, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Honey Chilli Potato", "category": "Chinese", "price_half": 80, "price_full": 140, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Paneer (Dry)", "category": "Chinese", "price_half": 149, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Paneer (Gravy)", "category": "Chinese", "price_half": 169, "price_full": 299, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Manchurian (Dry)", "category": "Chinese", "price_half": 79, "price_full": 129, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Manchurian (Gravy)", "category": "Chinese", "price_half": 89, "price_full": 139, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Chowmein", "category": "Chinese", "price_half": 59, "price_full": 99, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Garlic Chowmein", "category": "Chinese", "price_half": 69, "price_full": 119, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Hakka Noodles", "category": "Chinese", "price_half": 69, "price_full": 119, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Chowmein", "category": "Chinese", "price_half": 79, "price_full": 129, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Fried Rice", "category": "Chinese", "price_half": 59, "price_full": 99, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Garlic Fried Rice", "category": "Chinese", "price_half": 69, "price_full": 119, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Soya Chap", "category": "Chinese", "price_half": 139, "price_full": 259, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Spring Rolls", "category": "Chinese", "price_half": 59, "price_full": 119, "is_vegetarian": True, "is_available": True},
        
        # Momos
        {"id": str(uuid.uuid4()), "name": "Veg Momos Steam", "category": "Momos", "price_half": 60, "price_full": 100, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Momos Fry", "category": "Momos", "price_half": 60, "price_full": 100, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Momos Steam", "category": "Momos", "price_half": 70, "price_full": 120, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Momos Fry", "category": "Momos", "price_half": 80, "price_full": 130, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kurkure Veg Momos", "category": "Momos", "price_half": 90, "price_full": 170, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kurkure Paneer Momos", "category": "Momos", "price_half": 100, "price_full": 180, "is_vegetarian": True, "is_available": True},
        
        # Snacks & Starters
        {"id": str(uuid.uuid4()), "name": "Paneer Tikka", "category": "Snacks & Starters", "price_half": 149, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Achari Tikka", "category": "Snacks & Starters", "price_half": 159, "price_full": 289, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Malai Tikka", "category": "Snacks & Starters", "price_half": 169, "price_full": 299, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Tandoori Soya Chap", "category": "Snacks & Starters", "price_half": 149, "price_full": 259, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Achari Soya Chap", "category": "Snacks & Starters", "price_half": 159, "price_full": 269, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Malai Soya Chap", "category": "Snacks & Starters", "price_half": 169, "price_full": 289, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Seek Kabab", "category": "Snacks & Starters", "price_half": 159, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Hara Bhara Kabab", "category": "Snacks & Starters", "price_half": 159, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dahi Kabab", "category": "Snacks & Starters", "price_half": 149, "price_full": 279, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Tandoori Mushroom", "category": "Snacks & Starters", "price_half": 139, "price_full": 249, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Stuffed Mushroom", "category": "Snacks & Starters", "price_half": 139, "price_full": 249, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Afghani Veg Momos", "category": "Snacks & Starters", "price_full": 160, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Afghani Paneer Momos", "category": "Snacks & Starters", "price_full": 180, "is_vegetarian": True, "is_available": True},
        
        # Main Course
        {"id": str(uuid.uuid4()), "name": "Shahi Paneer", "category": "Main Course", "price_quarter": 139, "price_half": 229, "price_full": 349, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Matar Paneer", "category": "Main Course", "price_quarter": 129, "price_half": 199, "price_full": 319, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Butter Masala", "category": "Main Course", "price_quarter": 139, "price_half": 219, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kadhai Paneer", "category": "Main Course", "price_quarter": 139, "price_half": 219, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Paneer Lababdar", "category": "Main Course", "price_quarter": 139, "price_half": 249, "price_full": 359, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Tawa Paneer", "category": "Main Course", "price_quarter": 139, "price_half": 249, "price_full": 359, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Shahi Soya Chap", "category": "Main Course", "price_quarter": 139, "price_half": 229, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kadhai Soya Chap", "category": "Main Course", "price_quarter": 139, "price_half": 249, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Tawa Soya Chap", "category": "Main Course", "price_quarter": 129, "price_half": 209, "price_full": 319, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dal Makhni", "category": "Main Course", "price_quarter": 119, "price_half": 199, "price_full": 319, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dhaba Dal", "category": "Main Course", "price_quarter": 119, "price_half": 219, "price_full": 319, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dal Tadka", "category": "Main Course", "price_quarter": 89, "price_half": 159, "price_full": 239, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Mix Veg", "category": "Main Course", "price_quarter": 119, "price_half": 199, "price_full": 329, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Kadhai Mushroom", "category": "Main Course", "price_quarter": 129, "price_half": 219, "price_full": 339, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Aloo Gobhi", "category": "Main Course", "price_quarter": 89, "price_half": 149, "price_full": 249, "is_vegetarian": True, "is_available": True},
        
        # Tandoori Bread
        {"id": str(uuid.uuid4()), "name": "Tandoori Roti", "category": "Tandoori Bread", "price_full": 10, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Tandoori Butter Roti", "category": "Tandoori Bread", "price_full": 15, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Plain Naan", "category": "Tandoori Bread", "price_full": 25, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Butter Naan", "category": "Tandoori Bread", "price_full": 30, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Garlic Naan", "category": "Tandoori Bread", "price_full": 40, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Lachha Paratha", "category": "Tandoori Bread", "price_full": 35, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Garlic Paratha", "category": "Tandoori Bread", "price_full": 40, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Missi Roti", "category": "Tandoori Bread", "price_full": 35, "is_vegetarian": True, "is_available": True},
        
        # Rice
        {"id": str(uuid.uuid4()), "name": "Plain Rice", "category": "Rice", "price_half": 49, "price_full": 89, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Jeera Rice", "category": "Rice", "price_half": 59, "price_full": 99, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Pulao", "category": "Rice", "price_half": 69, "price_full": 119, "is_vegetarian": True, "is_available": True},
        
        # Thali
        {"id": str(uuid.uuid4()), "name": "Deluxe Thali", "category": "Thali", "price_full": 199, "description": "Shahi Paneer + Dal Makhni + Aloo Gobhi + Rice + 2 Tandoori Butter Roti + Raita + Salad + Chutney", "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Thali", "category": "Thali", "price_full": 159, "description": "Matar Paneer + Dal Tadka + Rice + 2 Tandoori Butter Roti + Raita + Chutney", "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Veg Mini Thali", "category": "Thali", "price_full": 139, "description": "Shahi Paneer + Dal Makhni + Rice + 2 Tandoori Butter Roti", "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Seasonal Thali", "category": "Thali", "price_full": 129, "description": "Aloo Gobhi + Dal Tadka + Rice + 2 Tandoori Butter Roti", "is_vegetarian": True, "is_available": True},
        
        # Combo Menu
        {"id": str(uuid.uuid4()), "name": "Rajma Chawal", "category": "Combo Menu", "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chhole Chawal", "category": "Combo Menu", "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "4 Puri + Aloo Sabzi", "category": "Combo Menu", "price_full": 79, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Aloo Sabzi + 4 Roti", "category": "Combo Menu", "price_full": 99, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Dal Chawal", "category": "Combo Menu", "price_full": 99, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Manchurian + Fried Rice", "category": "Combo Menu", "price_full": 149, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Manchurian + Chowmein", "category": "Combo Menu", "price_full": 149, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Paneer + Fried Rice", "category": "Combo Menu", "price_full": 169, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Chilli Paneer + Chowmein", "category": "Combo Menu", "price_full": 169, "is_vegetarian": True, "is_available": True},
        
        # Accompaniments
        {"id": str(uuid.uuid4()), "name": "Curd (100 mL)", "category": "Accompaniments", "price_full": 29, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Curd (300 mL)", "category": "Accompaniments", "price_full": 59, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Boondi Raita", "category": "Accompaniments", "price_half": 39, "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Mix Raita", "category": "Accompaniments", "price_half": 49, "price_full": 79, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Gulab Jamun (2 Piece)", "category": "Accompaniments", "price_full": 69, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Mint Chutney (100ml)", "category": "Accompaniments", "price_full": 39, "is_vegetarian": True, "is_available": True},
        
        # Beverages
        {"id": str(uuid.uuid4()), "name": "Tea", "category": "Beverages", "price_full": 30, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Hot Coffee", "category": "Beverages", "price_full": 30, "is_vegetarian": True, "is_available": True},
        {"id": str(uuid.uuid4()), "name": "Cold Drink", "category": "Beverages", "price_full": 25, "description": "MRP", "is_vegetarian": True, "is_available": True},
    ]
    
    for item in menu_items:
        item["created_at"] = datetime.utcnow()
        item["updated_at"] = datetime.utcnow()
    
    await menu_collection.insert_many(menu_items)
    
    # Create sample coupons
    coupons = [
        {
            "id": str(uuid.uuid4()),
            "code": "WELCOME50",
            "description": "Welcome offer - Flat ₹50 off",
            "discount_type": "fixed",
            "discount_value": 50,
            "min_order_value": 200,
            "max_discount": None,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=30),
            "usage_limit": 100,
            "usage_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "code": "SAVE20",
            "description": "Get 20% off on orders above ₹500",
            "discount_type": "percentage",
            "discount_value": 20,
            "min_order_value": 500,
            "max_discount": 100,
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=60),
            "usage_limit": None,
            "usage_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    await coupons_collection.insert_many(coupons)
    
    return {
        "message": "Database seeded successfully",
        "users_created": len(default_users),
        "categories_created": len(categories),
        "menu_items_created": len(menu_items),
        "coupons_created": len(coupons)
    }

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {
        "message": "VDC Restro API",
        "version": "1.0.0",
        "status": "operational"
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
