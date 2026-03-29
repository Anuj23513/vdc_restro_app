from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    price_half: Optional[float] = None
    price_full: Optional[float] = None
    price_quarter: Optional[float] = None
    image: Optional[str] = None  # base64
    is_vegetarian: bool = True
    is_available: bool = True
    spice_level: Optional[Literal['mild', 'medium', 'hot']] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItem(MenuItemBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Category(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    image: Optional[str] = None  # base64
    order: int = 0
    is_active: bool = True