from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    quantity: int
    size: Optional[Literal['half', 'full', 'quarter']] = 'full'
    price: float
    special_instructions: Optional[str] = None

class OrderBase(BaseModel):
    items: List[OrderItem]
    delivery_address: dict
    payment_method: Literal['cod', 'online']
    coupon_code: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: str
    order_number: str
    customer_id: str
    customer_name: str
    customer_phone: str
    subtotal: float
    discount: float = 0
    delivery_fee: float = 0
    tax: float = 0
    total: float
    status: Literal['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'] = 'pending'
    payment_status: Literal['pending', 'completed', 'failed'] = 'pending'
    payment_id: Optional[str] = None
    assigned_rider_id: Optional[str] = None
    assigned_rider_name: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None

class OrderStatusUpdate(BaseModel):
    status: Literal['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']

class AssignRider(BaseModel):
    rider_id: str