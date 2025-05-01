"""
Test module for packagescore security utilities
"""
import os
import unittest
from unittest.mock import patch
import jwt
from datetime import datetime, timedelta

from packagescore.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token,
    generate_secure_token, generate_api_key,
    create_hmac_signature, verify_hmac_signature,
    encrypt_data, decrypt_data,
    encrypt_with_password, decrypt_with_password,
    generate_totp_secret, verify_totp,
    get_totp_uri, generate_recovery_codes
)

class TestSecurityModule(unittest.TestCase):
    """Test class for security module functions"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "secure_password123"
        hashed = get_password_hash(password)
        
        # Verify original password matches hash
        self.assertTrue(verify_password(password, hashed))
        
        # Verify wrong password doesn't match
        self.assertFalse(verify_password("wrong_password", hashed))
    
    def test_jwt_tokens(self):
        """Test JWT token creation and decoding"""
        with patch("packagescore.security.JWT_SECRET_KEY", "test-secret-key"):
            # Create a token
            user_data = {"sub": "user123", "role": "admin"}
            token = create_access_token(user_data)
            
            # Decode and verify token
            decoded = decode_token(token)
            self.assertEqual(decoded.get("sub"), "user123")
            self.assertEqual(decoded.get("role"), "admin")
            self.assertEqual(decoded.get("type"), "access")
            
            # Test with custom expiration
            expire_delta = timedelta(minutes=5)
            token = create_access_token(user_data, expire_delta)
            decoded = decode_token(token)
            
            # Calculate expected expiration (with 10 second tolerance)
            exp_time = datetime.utcnow() + expire_delta
            token_exp = datetime.utcfromtimestamp(decoded.get("exp"))
            diff = abs((exp_time - token_exp).total_seconds())
            self.assertLess(diff, 10)  # Should be within 10 seconds
            
            # Test refresh token
            refresh_token = create_refresh_token(user_data)
            decoded = decode_token(refresh_token)
            self.assertEqual(decoded.get("type"), "refresh")
    
    def test_token_generation(self):
        """Test secure token generation"""
        token1 = generate_secure_token()
        token2 = generate_secure_token()
        
        # Tokens should be unique
        self.assertNotEqual(token1, token2)
        
        # Test custom length
        token3 = generate_secure_token(length=64)
        self.assertGreater(len(token3), len(token1))
        
        # Test API key generation
        api_key = generate_api_key()
        self.assertTrue(api_key.startswith("sk_"))
    
    def test_hmac_signatures(self):
        """Test HMAC signature creation and verification"""
        key = "secret_key_12345"
        message = "This is a message to sign"
        
        # Create signature
        signature = create_hmac_signature(key, message)
        
        # Verify signature
        self.assertTrue(verify_hmac_signature(key, message, signature))
        
        # Should fail with different message
        self.assertFalse(verify_hmac_signature(key, "different message", signature))
        
        # Should fail with different key
        self.assertFalse(verify_hmac_signature("different_key", message, signature))
        
        # Test different digest methods
        sha512_sig = create_hmac_signature(key, message, "sha512")
        self.assertTrue(verify_hmac_signature(key, message, sha512_sig, "sha512"))
        self.assertNotEqual(signature, sha512_sig)
    
    def test_encryption(self):
        """Test data encryption and decryption"""
        original_data = "Sensitive information to encrypt"
        
        # Test basic encryption
        encrypted = encrypt_data(original_data)
        decrypted = decrypt_data(encrypted)
        
        # Original and decrypted should match
        self.assertEqual(original_data, decrypted)
        
        # Encrypted should be different from original
        self.assertNotEqual(original_data, encrypted)
        
        # Test password-based encryption
        password = "my-secure-password"
        result = encrypt_with_password(original_data, password)
        
        self.assertIn("encrypted_data", result)
        self.assertIn("salt", result)
        
        # Decrypt with password
        decrypted = decrypt_with_password(
            result["encrypted_data"],
            password,
            result["salt"]
        )
        
        self.assertEqual(original_data, decrypted)
        
        # Should fail with wrong password
        with self.assertRaises(Exception):
            decrypt_with_password(
                result["encrypted_data"],
                "wrong-password",
                result["salt"]
            )
    
    def test_2fa(self):
        """Test two-factor authentication functions"""
        # Generate a TOTP secret
        secret = generate_totp_secret()
        self.assertTrue(secret)  # Secret should not be empty
        
        # Get URI for QR code
        uri = get_totp_uri(secret, "test@example.com", "TestApp")
        self.assertIn("test@example.com", uri)
        self.assertIn("TestApp", uri)
        
        # Generate recovery codes
        codes = generate_recovery_codes(5)
        self.assertEqual(len(codes), 5)
        
        # Check format of recovery codes
        for code in codes:
            self.assertEqual(len(code), 14)  # XXXX-XXXX-XXXX
            self.assertEqual(code.count("-"), 2)  # Two dashes
    
    # Note: We can't easily test TOTP verification in a unit test
    # because it depends on the current time

if __name__ == "__main__":
    unittest.main()