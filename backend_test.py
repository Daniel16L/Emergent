#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Tomibena CRM
Tests all authentication, CRUD operations, and business logic endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TomibenaAPITester:
    def __init__(self, base_url: str = "https://combustibil-crm.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test results tracking
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Auth tokens for different roles
        self.admin_token = None
        self.agent_token = None
        self.driver_token = None
        
        # Test data IDs
        self.test_client_id = None
        self.test_product_id = None
        self.test_order_id = None
        self.test_vehicle_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    expected_status: int = 200, token: str = None) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test admin login
        success, data = self.make_request(
            'POST', 'auth/login',
            {"email": "admin.crm@demo.com", "password": "Admin123!"}
        )
        if success and 'id' in data:
            self.admin_token = data.get('access_token')  # May not be in response due to httpOnly cookies
            self.log_test("Admin Login", True, f"Admin ID: {data['id']}")
        else:
            self.log_test("Admin Login", False, f"Response: {data}")
        
        # Test agent login
        success, data = self.make_request(
            'POST', 'auth/login',
            {"email": "ion.popescu@demo.ro", "password": "Agent123!"}
        )
        if success and 'id' in data:
            self.agent_token = data.get('access_token')
            self.log_test("Agent Login", True, f"Agent ID: {data['id']}")
        else:
            self.log_test("Agent Login", False, f"Response: {data}")
        
        # Test driver login
        success, data = self.make_request(
            'POST', 'auth/login',
            {"email": "vasile.marin@demo.ro", "password": "Sofer123!"}
        )
        if success and 'id' in data:
            self.driver_token = data.get('access_token')
            self.log_test("Driver Login", True, f"Driver ID: {data['id']}")
        else:
            self.log_test("Driver Login", False, f"Response: {data}")
        
        # Test invalid login
        success, data = self.make_request(
            'POST', 'auth/login',
            {"email": "invalid@test.com", "password": "wrong"},
            expected_status=401
        )
        self.log_test("Invalid Login Rejection", success, "Should return 401")
        
        # Test /auth/me endpoint (should work with cookies)
        success, data = self.make_request('GET', 'auth/me')
        self.log_test("Auth Me Endpoint", success, f"User data: {data.get('email', 'No email')}")

    def test_dashboard_endpoints(self):
        """Test dashboard statistics endpoints"""
        print("\n📊 Testing Dashboard Endpoints...")
        
        # Test dashboard stats
        success, data = self.make_request('GET', 'dashboard/stats')
        if success:
            required_fields = ['total_sales', 'total_orders', 'channel_stats', 'low_stock']
            has_all_fields = all(field in data for field in required_fields)
            self.log_test("Dashboard Stats", has_all_fields, 
                         f"Sales: {data.get('total_sales', 0)}, Orders: {data.get('total_orders', 0)}")
        else:
            self.log_test("Dashboard Stats", False, f"Response: {data}")
        
        # Test monthly sales
        success, data = self.make_request('GET', 'dashboard/monthly-sales')
        if success and isinstance(data, list):
            self.log_test("Monthly Sales Chart", True, f"Got {len(data)} months of data")
        else:
            self.log_test("Monthly Sales Chart", False, f"Response: {data}")

    def test_products_endpoints(self):
        """Test products CRUD operations"""
        print("\n📦 Testing Products Endpoints...")
        
        # Get all products
        success, data = self.make_request('GET', 'products')
        if success and isinstance(data, list):
            self.log_test("Get Products", True, f"Found {len(data)} products")
            if data:
                self.test_product_id = data[0]['id']
                # Verify product structure
                product = data[0]
                required_fields = ['name', 'unit', 'current_stock', 'sale_price']
                has_fields = all(field in product for field in required_fields)
                self.log_test("Product Data Structure", has_fields, 
                             f"Product: {product.get('name', 'Unknown')}")
        else:
            self.log_test("Get Products", False, f"Response: {data}")

    def test_clients_endpoints(self):
        """Test clients CRUD operations"""
        print("\n👥 Testing Clients Endpoints...")
        
        # Get all clients
        success, data = self.make_request('GET', 'clients')
        if success and isinstance(data, list):
            self.log_test("Get Clients", True, f"Found {len(data)} clients")
            if data:
                self.test_client_id = data[0]['id']
                # Verify client structure
                client = data[0]
                required_fields = ['name', 'phone', 'county', 'city']
                has_fields = all(field in client for field in required_fields)
                self.log_test("Client Data Structure", has_fields,
                             f"Client: {client.get('name', 'Unknown')}")
        else:
            self.log_test("Get Clients", False, f"Response: {data}")
        
        # Test client search by phone
        if self.test_client_id:
            success, data = self.make_request('GET', 'clients/0744')  # Partial phone search
            self.log_test("Client Phone Search", success, 
                         f"Search result: {data.get('name', 'No result') if data else 'None'}")

    def test_orders_endpoints(self):
        """Test orders CRUD operations"""
        print("\n🛒 Testing Orders Endpoints...")
        
        # Get all orders
        success, data = self.make_request('GET', 'orders')
        if success and isinstance(data, list):
            self.log_test("Get Orders", True, f"Found {len(data)} orders")
            if data:
                self.test_order_id = data[0]['id']
        else:
            self.log_test("Get Orders", False, f"Response: {data}")
        
        # Test creating a new order (if we have client and product)
        if self.test_client_id and self.test_product_id:
            order_data = {
                "client_id": self.test_client_id,
                "channel": "phone",
                "payment_method": "cash-on-delivery",
                "lines": [{
                    "product_id": self.test_product_id,
                    "product_name": "Test Product",
                    "quantity": 1,
                    "unit_price": 100
                }],
                "notes": "Test order from API testing",
                "delivery_type": "own_fleet"
            }
            success, data = self.make_request('POST', 'orders', order_data, expected_status=200)
            if success and 'id' in data:
                self.test_order_id = data['id']
                self.log_test("Create Order", True, f"Order ID: {data['id']}")
            else:
                self.log_test("Create Order", False, f"Response: {data}")

    def test_vehicles_endpoints(self):
        """Test vehicles endpoints"""
        print("\n🚚 Testing Vehicles Endpoints...")
        
        # Get all vehicles
        success, data = self.make_request('GET', 'vehicles')
        if success and isinstance(data, list):
            self.log_test("Get Vehicles", True, f"Found {len(data)} vehicles")
            if data:
                self.test_vehicle_id = data[0]['id']
                vehicle = data[0]
                required_fields = ['plate', 'name', 'max_kg']
                has_fields = all(field in vehicle for field in required_fields)
                self.log_test("Vehicle Data Structure", has_fields,
                             f"Vehicle: {vehicle.get('plate', 'Unknown')}")
        else:
            self.log_test("Get Vehicles", False, f"Response: {data}")

    def test_users_endpoints(self):
        """Test users management endpoints"""
        print("\n👤 Testing Users Endpoints...")
        
        # Get all users (admin only)
        success, data = self.make_request('GET', 'users')
        if success and isinstance(data, list):
            self.log_test("Get Users", True, f"Found {len(data)} users")
            # Check for different roles
            roles = [user.get('role') for user in data]
            has_admin = 'admin' in roles
            has_agent = 'agent' in roles
            has_driver = 'driver' in roles
            self.log_test("User Roles Present", has_admin and has_agent and has_driver,
                         f"Roles: {set(roles)}")
        else:
            self.log_test("Get Users", False, f"Response: {data}")
        
        # Get agents
        success, data = self.make_request('GET', 'agents')
        if success and isinstance(data, list):
            self.log_test("Get Agents", True, f"Found {len(data)} agents")
        else:
            self.log_test("Get Agents", False, f"Response: {data}")
        
        # Get drivers
        success, data = self.make_request('GET', 'drivers')
        if success and isinstance(data, list):
            self.log_test("Get Drivers", True, f"Found {len(data)} drivers")
        else:
            self.log_test("Get Drivers", False, f"Response: {data}")

    def test_targets_endpoints(self):
        """Test targets endpoints"""
        print("\n🎯 Testing Targets Endpoints...")
        
        # Get all targets
        success, data = self.make_request('GET', 'targets')
        if success and isinstance(data, list):
            self.log_test("Get Targets", True, f"Found {len(data)} targets")
        else:
            self.log_test("Get Targets", False, f"Response: {data}")

    def test_deliveries_endpoints(self):
        """Test deliveries endpoints"""
        print("\n🚛 Testing Deliveries Endpoints...")
        
        # Get all deliveries
        success, data = self.make_request('GET', 'deliveries')
        if success and isinstance(data, list):
            self.log_test("Get Deliveries", True, f"Found {len(data)} deliveries")
        else:
            self.log_test("Get Deliveries", False, f"Response: {data}")

    def test_receipts_endpoints(self):
        """Test receipts (stock increase) endpoints"""
        print("\n📋 Testing Receipts Endpoints...")
        
        # Get all receipts
        success, data = self.make_request('GET', 'receipts')
        if success and isinstance(data, list):
            self.log_test("Get Receipts", True, f"Found {len(data)} receipts")
        else:
            self.log_test("Get Receipts", False, f"Response: {data}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Tomibena CRM API Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all test suites
        self.test_auth_endpoints()
        self.test_dashboard_endpoints()
        self.test_products_endpoints()
        self.test_clients_endpoints()
        self.test_orders_endpoints()
        self.test_vehicles_endpoints()
        self.test_users_endpoints()
        self.test_targets_endpoints()
        self.test_deliveries_endpoints()
        self.test_receipts_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = TomibenaAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())