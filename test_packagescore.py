"""
packagescore.utils 모듈 테스트 스크립트
"""
try:
    import sys
    print(f"Python 경로: {sys.path}")
    
    # packagescore 모듈 가져오기 시도
    print("packagescore 모듈 가져오기 시도...")
    import packagescore
    print(f"packagescore.__file__: {packagescore.__file__}")
    
    # packagescore.utils 모듈 가져오기 시도
    print("packagescore.utils 모듈 가져오기 시도...")
    from packagescore.utils import validate_license_plate, format_currency, mask_vin
    
    # 몇 가지 함수 테스트
    test_plate = "12가 3456"
    is_valid = validate_license_plate(test_plate)
    print(f"번호판 '{test_plate}' 유효성: {is_valid}")
    
    test_money = 150000
    formatted = format_currency(test_money)
    print(f"금액 포맷팅: {test_money} -> {formatted}")
    
    test_vin = "1HGCM82633A123456"
    masked = mask_vin(test_vin)
    print(f"차대번호 마스킹: {test_vin} -> {masked}")
    
    print("packagescore.utils 모듈 테스트 성공!")
    
except ImportError as e:
    print(f"모듈 가져오기 오류: {e}")
except Exception as e:
    print(f"테스트 중 오류 발생: {e}")