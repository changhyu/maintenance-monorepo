/**
 * 차량 관련 타입 정의
 */
/**
 * 차량 상태 열거형
 */
export var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["ACTIVE"] = "active";
    VehicleStatus["MAINTENANCE"] = "maintenance";
    VehicleStatus["INACTIVE"] = "inactive";
})(VehicleStatus || (VehicleStatus = {}));
/**
 * 차량 유형 열거형
 */
export var VehicleType;
(function (VehicleType) {
    VehicleType["TRUCK"] = "\uD654\uBB3C\uD2B8\uB7ED";
    VehicleType["BUS"] = "\uBC84\uC2A4";
    VehicleType["VAN"] = "\uBC34";
    VehicleType["TAXI"] = "\uD0DD\uC2DC";
    VehicleType["SEDAN"] = "\uC2B9\uC6A9\uCC28";
    VehicleType["SUV"] = "SUV";
    VehicleType["PICKUP"] = "\uD53D\uC5C5\uD2B8\uB7ED";
    VehicleType["SPECIAL"] = "\uD2B9\uC218\uCC28\uB7C9";
})(VehicleType || (VehicleType = {}));
export var FuelType;
(function (FuelType) {
    FuelType["GASOLINE"] = "\uAC00\uC194\uB9B0";
    FuelType["DIESEL"] = "\uB514\uC824";
    FuelType["LPG"] = "LPG";
    FuelType["ELECTRIC"] = "\uC804\uAE30";
    FuelType["HYBRID"] = "\uD558\uC774\uBE0C\uB9AC\uB4DC";
    FuelType["HYDROGEN"] = "\uC218\uC18C";
})(FuelType || (FuelType = {}));
/**
 * 차량 변환 유틸리티 함수
 * 다양한 소스의 Vehicle 객체를 통합 타입으로 변환
 */
/**
 * API 클라이언트에서 사용하는 Vehicle 타입을 Frontend Vehicle 타입으로 변환
 */
export function convertApiVehicleToFrontend(apiVehicle) {
    return {
        id: apiVehicle.id,
        name: apiVehicle.model || apiVehicle.make || '차량',
        type: apiVehicle.type || '기타',
        status: apiVehicle.status || 'inactive',
        healthScore: apiVehicle.healthScore || 80,
        model: apiVehicle.model,
        year: apiVehicle.year,
        licensePlate: apiVehicle.licensePlate,
        vin: apiVehicle.vin,
        manufacturer: apiVehicle.make,
        fuelType: apiVehicle.fuelType,
        fuelLevel: apiVehicle.fuelLevel,
        mileage: apiVehicle.currentMileage || apiVehicle.mileage,
        lastMaintenanceDate: apiVehicle.lastServiceDate
            ? new Date(apiVehicle.lastServiceDate)
            : undefined,
        nextMaintenanceDate: apiVehicle.nextServiceDate
            ? new Date(apiVehicle.nextServiceDate)
            : undefined,
        assignedDriverId: apiVehicle.assignedDriverId,
        location: apiVehicle.location
            ? {
                latitude: apiVehicle.location.latitude,
                longitude: apiVehicle.location.longitude,
                lastUpdated: new Date(apiVehicle.location.lastUpdated || new Date())
            }
            : undefined
    };
}
/**
 * Frontend Vehicle 타입을 API 요청 형식으로 변환
 */
export function convertFrontendVehicleToApi(vehicle) {
    return {
        id: vehicle.id,
        make: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.licensePlate,
        vin: vehicle.vin,
        status: vehicle.status,
        fuelType: vehicle.fuelType,
        fuelLevel: vehicle.fuelLevel,
        currentMileage: vehicle.mileage,
        lastServiceDate: vehicle.lastMaintenanceDate
            ? vehicle.lastMaintenanceDate.toISOString()
            : undefined,
        nextServiceDate: vehicle.nextMaintenanceDate
            ? vehicle.nextMaintenanceDate.toISOString()
            : undefined,
        assignedDriverId: vehicle.assignedDriverId
    };
}
/**
 * 서비스 Vehicle을 Frontend Vehicle로 변환하는 유틸리티 함수
 */
export function convertServiceVehicleToFrontend(serviceVehicle) {
    if (!serviceVehicle)
        return null;
    return {
        id: serviceVehicle.id || '',
        name: serviceVehicle.name || serviceVehicle.model || '미확인 차량',
        type: serviceVehicle.type || VehicleType.SEDAN,
        status: serviceVehicle.status || VehicleStatus.INACTIVE,
        healthScore: serviceVehicle.healthScore || 0,
        model: serviceVehicle.model,
        year: serviceVehicle.year,
        licensePlate: serviceVehicle.licensePlate,
        vin: serviceVehicle.vin,
        manufacturer: serviceVehicle.manufacturer,
        fuelType: serviceVehicle.fuelType,
        fuelLevel: serviceVehicle.fuelLevel,
        mileage: serviceVehicle.mileage || serviceVehicle.totalMileage,
        lastMaintenanceDate: serviceVehicle.lastMaintenanceDate
            ? new Date(serviceVehicle.lastMaintenanceDate)
            : undefined,
        nextMaintenanceDate: serviceVehicle.nextMaintenanceDate
            ? new Date(serviceVehicle.nextMaintenanceDate)
            : undefined,
        purchaseDate: serviceVehicle.purchaseDate ? new Date(serviceVehicle.purchaseDate) : undefined,
        assignedDriverId: serviceVehicle.assignedDriverId || serviceVehicle.driverId,
        departmentId: serviceVehicle.departmentId,
        fleetId: serviceVehicle.fleetId,
        insuranceExpiration: serviceVehicle.insuranceExpiration
            ? new Date(serviceVehicle.insuranceExpiration)
            : undefined,
        location: serviceVehicle.location
            ? {
                latitude: serviceVehicle.location.latitude,
                longitude: serviceVehicle.location.longitude,
                lastUpdated: new Date(serviceVehicle.location.lastUpdated || new Date())
            }
            : undefined,
        telemetryEnabled: serviceVehicle.telemetryEnabled || false,
        maintenanceHistory: Array.isArray(serviceVehicle.maintenanceHistory)
            ? serviceVehicle.maintenanceHistory.map((item) => ({
                id: item.id || '',
                date: new Date(item.date || new Date()),
                type: item.type || '',
                description: item.description || '',
                cost: Number(item.cost) || 0,
                shopId: item.shopId
            }))
            : undefined
    };
}
