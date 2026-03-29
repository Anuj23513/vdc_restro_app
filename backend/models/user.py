from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: Literal['customer', 'admin', 'staff', 'rider'] = 'customer'

class UserCreate(UserBase):
    password: str
    firebase_uid: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    firebase_uid: Optional[str] = None
    addresses: list[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    profile_image: Optional[str] = None  # base64

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "email": "customer@vdcrestro.com",
                "name": "John Doe",
                "phone": "+91 9876543210",
                "role": "customer",
                "is_active": True
            }
        }

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: str
    addresses: list[dict] = []
    profile_image: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class Address(BaseModel):
    label: str  # "Home", "Work", etc.
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: bool = False