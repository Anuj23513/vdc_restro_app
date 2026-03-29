#!/usr/bin/env python3
"""
VDC Restro Backend API Test Suite
Tests all backend API endpoints with proper authentication and validation
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://vdc-ordering-hub.preview.emergentagent.com/api"
TIMEOUT = 30

# Test credentials from test_credentials.md
TEST_CREDENTIALS = {
    "admin": {"email": "admin@vdcrestro.com", "password": "Admin@123"},
    "staff": {"email": "staff@vdcrestro.com", "password": "Staff@123"},
    "rider": {"email": "rider@vdcrestro.com", "password": "Rider@123"},
    "customer": {"email": "customer@vdcrestro.com", "password": "Customer@123"},
    "test_customer": {"email": "test@example.com", "password": "Test@123"}
}

class VDCRestroAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if not success:
            self.failed_tests.append(test_name)
        print()
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, params: Dict = None, token: str = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers, params=params, timeout=TIMEOUT)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers, params=params, timeout=TIMEOUT)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=request_headers, params=params, timeout=TIMEOUT)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers, params=params, timeout=TIMEOUT)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_check(self):
        """Test basic health check endpoints"""
        print("=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Root endpoint", True, f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}")
            else:
                self.log_test("Root endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.make_request("GET", "/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health check", True, f"Status: {response.status_code}, Health: {data.get('status', 'N/A')}")
            else:
                self.log_test("Health check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Health check", False, f"Exception: {str(e)}")
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("=== AUTHENTICATION TESTS ===")
        
        # Test user registration
        try:
            new_user_data = {
                "email": f"testuser_{datetime.now().strftime('%Y%m%d_%H%M%S')}@vdcrestro.com",
                "password": "TestUser@123",
                "name": "Test User Registration",
                "phone": "+91 9876543210",
                "role": "customer",
                "firebase_uid": None
            }
            
            response = self.make_request("POST", "/auth/register", data=new_user_data)
            if response.status_code == 200:
                data = response.json()
                self.log_test("User registration", True, f"User created with ID: {data.get('user', {}).get('id', 'N/A')}")
            else:
                self.log_test("User registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User registration", False, f"Exception: {str(e)}")
        
        # Test login for each role
        for role, credentials in TEST_CREDENTIALS.items():
            try:
                response = self.make_request("POST", "/auth/login", data=credentials)
                if response.status_code == 200:
                    data = response.json()
                    token = data.get("access_token")
                    user_info = data.get("user", {})
                    
                    if token:
                        self.tokens[role] = token
                        self.log_test(f"Login - {role}", True, 
                                    f"Role: {user_info.get('role')}, Name: {user_info.get('name')}")
                    else:
                        self.log_test(f"Login - {role}", False, "No access token received")
                else:
                    self.log_test(f"Login - {role}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test(f"Login - {role}", False, f"Exception: {str(e)}")
        
        # Test get current user for each logged-in role
        for role, token in self.tokens.items():
            try:
                response = self.make_request("GET", "/auth/me", token=token)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Get current user - {role}", True, 
                                f"User: {data.get('name')}, Role: {data.get('role')}")
                else:
                    self.log_test(f"Get current user - {role}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test(f"Get current user - {role}", False, f"Exception: {str(e)}")
    
    def test_menu_endpoints(self):
        """Test menu-related endpoints"""
        print("=== MENU TESTS ===")
        
        # Test get all menu items
        try:
            response = self.make_request("GET", "/menu")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get all menu items", True, f"Found {len(data)} menu items")
            else:
                self.log_test("Get all menu items", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get all menu items", False, f"Exception: {str(e)}")
        
        # Test filter by category
        try:
            response = self.make_request("GET", "/menu", params={"category": "Chinese"})
            if response.status_code == 200:
                data = response.json()
                self.log_test("Filter menu by category", True, f"Found {len(data)} Chinese items")
            else:
                self.log_test("Filter menu by category", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Filter menu by category", False, f"Exception: {str(e)}")
        
        # Test search menu items
        try:
            response = self.make_request("GET", "/menu", params={"search": "paneer"})
            if response.status_code == 200:
                data = response.json()
                self.log_test("Search menu items", True, f"Found {len(data)} paneer items")
            else:
                self.log_test("Search menu items", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Search menu items", False, f"Exception: {str(e)}")
        
        # Test get categories
        try:
            response = self.make_request("GET", "/categories")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get categories", True, f"Found {len(data)} categories")
            else:
                self.log_test("Get categories", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get categories", False, f"Exception: {str(e)}")
    
    def test_order_endpoints(self):
        """Test order-related endpoints (requires customer authentication)"""
        print("=== ORDER TESTS ===")
        
        customer_token = self.tokens.get("customer")
        if not customer_token:
            self.log_test("Order tests", False, "No customer token available")
            return
        
        # First, get some real menu items to use in the order
        menu_items = []
        try:
            response = self.make_request("GET", "/menu")
            if response.status_code == 200:
                menu_data = response.json()
                if len(menu_data) >= 2:
                    menu_items = menu_data[:2]  # Take first 2 items
        except Exception as e:
            self.log_test("Get menu for order test", False, f"Exception: {str(e)}")
            return
        
        if len(menu_items) < 2:
            self.log_test("Order tests", False, "Not enough menu items available")
            return
        
        # Create a test order with real menu item IDs
        order_data = {
            "items": [
                {
                    "menu_item_id": menu_items[0]["id"],
                    "name": menu_items[0]["name"],
                    "price": menu_items[0].get("price_full", menu_items[0].get("price_half", 100)),
                    "quantity": 2,
                    "size": "full"
                },
                {
                    "menu_item_id": menu_items[1]["id"], 
                    "name": menu_items[1]["name"],
                    "price": menu_items[1].get("price_full", menu_items[1].get("price_half", 50)),
                    "quantity": 1,
                    "size": "full"
                }
            ],
            "delivery_address": {
                "label": "Home",
                "address_line1": "123 Test Street",
                "address_line2": "Near Test Mall",
                "city": "Delhi",
                "state": "Delhi",
                "pincode": "110001",
                "landmark": "Test Landmark",
                "is_default": True
            },
            "payment_method": "cod",
            "coupon_code": None
        }
        
        created_order_id = None
        
        try:
            response = self.make_request("POST", "/orders", data=order_data, token=customer_token)
            if response.status_code == 200:
                data = response.json()
                created_order_id = data.get("id")
                self.log_test("Create order", True, 
                            f"Order created with ID: {created_order_id}, Total: ₹{data.get('total', 'N/A')}")
            else:
                self.log_test("Create order", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create order", False, f"Exception: {str(e)}")
        
        # Test get customer orders
        try:
            response = self.make_request("GET", "/orders", token=customer_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get customer orders", True, f"Found {len(data)} orders")
            else:
                self.log_test("Get customer orders", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get customer orders", False, f"Exception: {str(e)}")
        
        # Test get specific order
        if created_order_id:
            try:
                response = self.make_request("GET", f"/orders/{created_order_id}", token=customer_token)
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("Get specific order", True, 
                                f"Order status: {data.get('status')}, Total: ₹{data.get('total')}")
                else:
                    self.log_test("Get specific order", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Get specific order", False, f"Exception: {str(e)}")
    
    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("=== ADMIN TESTS ===")
        
        admin_token = self.tokens.get("admin")
        if not admin_token:
            self.log_test("Admin tests", False, "No admin token available")
            return
        
        # Test get analytics
        try:
            response = self.make_request("GET", "/admin/analytics", token=admin_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get analytics", True, 
                            f"Total orders: {data.get('total_orders')}, Revenue: ₹{data.get('total_revenue')}")
            else:
                self.log_test("Get analytics", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get analytics", False, f"Exception: {str(e)}")
        
        # Test create menu item
        new_menu_item = {
            "name": "Test Special Dish",
            "category": "Special VDC Menu",
            "price_full": 199,
            "price_half": 119,
            "description": "Test dish created by API test",
            "is_vegetarian": True,
            "is_available": True,
            "image_url": None
        }
        
        try:
            response = self.make_request("POST", "/admin/menu", data=new_menu_item, token=admin_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Create menu item", True, f"Created item: {data.get('name')} with ID: {data.get('id')}")
            else:
                self.log_test("Create menu item", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create menu item", False, f"Exception: {str(e)}")
        
        # Test get all users
        try:
            response = self.make_request("GET", "/admin/users", token=admin_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get all users", True, f"Found {len(data)} users")
            else:
                self.log_test("Get all users", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get all users", False, f"Exception: {str(e)}")
    
    def test_coupon_endpoints(self):
        """Test coupon-related endpoints"""
        print("=== COUPON TESTS ===")
        
        customer_token = self.tokens.get("customer")
        if not customer_token:
            self.log_test("Coupon tests", False, "No customer token available")
            return
        
        # Test get coupons
        try:
            response = self.make_request("GET", "/coupons", token=customer_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get coupons", True, f"Found {len(data)} active coupons")
            else:
                self.log_test("Get coupons", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get coupons", False, f"Exception: {str(e)}")
        
        # Test validate coupon
        try:
            response = self.make_request("POST", "/coupons/validate/WELCOME50", 
                                       params={"order_amount": 300}, token=customer_token)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Validate coupon", True, 
                            f"Valid: {data.get('valid')}, Discount: ₹{data.get('discount')}")
            else:
                self.log_test("Validate coupon", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Validate coupon", False, f"Exception: {str(e)}")
    
    def test_role_based_access(self):
        """Test role-based access control"""
        print("=== ROLE-BASED ACCESS TESTS ===")
        
        customer_token = self.tokens.get("customer")
        if customer_token:
            # Customer should NOT be able to access admin endpoints
            try:
                response = self.make_request("GET", "/admin/analytics", token=customer_token)
                if response.status_code == 403:
                    self.log_test("Customer access to admin endpoint", True, "Correctly denied access (403)")
                else:
                    self.log_test("Customer access to admin endpoint", False, 
                                f"Should be denied but got status: {response.status_code}")
            except Exception as e:
                self.log_test("Customer access to admin endpoint", False, f"Exception: {str(e)}")
        
        # Test unauthorized access
        try:
            response = self.make_request("GET", "/auth/me")  # No token
            if response.status_code == 401 or response.status_code == 403:
                self.log_test("Unauthorized access", True, f"Correctly denied access ({response.status_code})")
            else:
                self.log_test("Unauthorized access", False, 
                            f"Should be denied but got status: {response.status_code}")
        except Exception as e:
            self.log_test("Unauthorized access", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting VDC Restro Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print("=" * 60)
        
        try:
            self.test_health_check()
            self.test_authentication()
            self.test_menu_endpoints()
            self.test_order_endpoints()
            self.test_admin_endpoints()
            self.test_coupon_endpoints()
            self.test_role_based_access()
            
        except Exception as e:
            print(f"Critical error during testing: {e}")
        
        # Print summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        print("\n" + "=" * 60)
        
        return {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": passed_tests/total_tests*100 if total_tests > 0 else 0,
            "failed_tests": self.failed_tests,
            "all_results": self.test_results
        }

if __name__ == "__main__":
    tester = VDCRestroAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)