from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    order_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    food_rating: Optional[int] = Field(None, ge=1, le=5)
    delivery_rating: Optional[int] = Field(None, ge=1, le=5)

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: str
    customer_id: str
    customer_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)