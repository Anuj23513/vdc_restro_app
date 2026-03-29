from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class CouponBase(BaseModel):
    code: str
    description: str
    discount_type: Literal['percentage', 'fixed']
    discount_value: float
    min_order_value: float = 0
    max_discount: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    usage_limit: Optional[int] = None
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class Coupon(CouponBase):
    id: str
    usage_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)