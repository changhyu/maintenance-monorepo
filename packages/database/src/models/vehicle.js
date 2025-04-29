/**
 * 차량 모델 서비스
 */
import { prisma } from '../index';
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["ACTIVE"] = "ACTIVE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["RETIRED"] = "RETIRED";
    VehicleStatus["OUT_OF_SERVICE"] = "OUT_OF_SERVICE";
})(VehicleStatus || (VehicleStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["SEDAN"] = "SEDAN";
    VehicleType["SUV"] = "SUV";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
    VehicleType["BUS"] = "BUS";
    VehicleType["OTHER"] = "OTHER";
})(VehicleType || (VehicleType = {}));
/**
 * 차량 서비스 클래스
 */
export class VehicleService {
    /**
     * 차량 목록 조회
     */
    async getVehicles(filter, skip = 0, take = 10) {
        const where = {};
        // 검색 필터 적용
        if (filter) {
            if (filter.make)
                where.make = { contains: filter.make, mode: 'insensitive' };
            if (filter.model)
                where.model = { contains: filter.model, mode: 'insensitive' };
            if (filter.year)
                where.year = filter.year;
            if (filter.type)
                where.type = filter.type;
            if (filter.status)
                where.status = filter.status;
            if (filter.ownerId)
                where.ownerID = filter.ownerId;
            // 생성일 범위 필터
            if (filter.fromDate || filter.toDate) {
                where.createdAt = {};
                if (filter.fromDate)
                    where.createdAt.gte = filter.fromDate;
                if (filter.toDate)
                    where.createdAt.lte = filter.toDate;
            }
            // 검색어 필터
            if (filter.search) {
                where.OR = [
                    { make: { contains: filter.search, mode: 'insensitive' } },
                    { model: { contains: filter.search, mode: 'insensitive' } },
                    { vin: { contains: filter.search, mode: 'insensitive' } },
                    { plate: { contains: filter.search, mode: 'insensitive' } }
                ];
            }
        }
        // 정렬 옵션
        const orderBy = {};
        if (filter?.sortBy) {
            orderBy[filter.sortBy] = filter.sortDirection || 'asc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        // 차량 목록 및 총 수 조회
        const [vehicles, total] = await Promise.all([
            prisma.vehicle.findMany({
                where,
                orderBy,
                skip,
                take,
                include: {
                    owner: true,
                    telemetry: true,
                },
            }),
            prisma.vehicle.count({ where }),
        ]);
        return { vehicles, total };
    }
    /**
     * 차량 상세 조회
     */
    async getVehicleById(id, includeRelations = true) {
        return prisma.vehicle.findUnique({
            where: { id },
            include: includeRelations ? {
                owner: true,
                telemetry: true,
                documents: true,
                maintenanceRecords: {
                    orderBy: { date: 'desc' },
                    take: 5,
                },
            } : undefined,
        });
    }
    /**
     * 차량 생성
     */
    async createVehicle(data) {
        return prisma.vehicle.create({ data });
    }
    /**
     * 차량 업데이트
     */
    async updateVehicle(id, data) {
        // 차량이 존재하는지 확인
        const vehicle = await prisma.vehicle.findUnique({ where: { id } });
        if (!vehicle)
            return null;
        return prisma.vehicle.update({
            where: { id },
            data,
        });
    }
    /**
     * 차량 삭제
     */
    async deleteVehicle(id) {
        try {
            // 관련 데이터 함께 삭제
            await prisma.$transaction([
                prisma.telemetry.deleteMany({ where: { vehicleID: id } }),
                prisma.vehicleDocument.deleteMany({ where: { vehicleID: id } }),
                prisma.maintenancePart.deleteMany({
                    where: {
                        maintenance: {
                            vehicleID: id
                        }
                    }
                }),
                prisma.maintenanceDocument.deleteMany({
                    where: {
                        maintenance: {
                            vehicleID: id
                        }
                    }
                }),
                prisma.maintenanceRecord.deleteMany({ where: { vehicleID: id } }),
                prisma.vehicle.delete({ where: { id } }),
            ]);
            return true;
        }
        catch (error) {
            console.error('차량 삭제 중 오류 발생:', error);
            return false;
        }
    }
    /**
     * 차량 상태 변경
     */
    async updateVehicleStatus(id, status) {
        return this.updateVehicle(id, { status });
    }
    /**
     * 차량의 정비 이력 조회
     */
    async getVehicleMaintenanceHistory(vehicleId, skip = 0, take = 10) {
        const [records, total] = await Promise.all([
            prisma.maintenanceRecord.findMany({
                where: { vehicleID: vehicleId },
                orderBy: { date: 'desc' },
                skip,
                take,
                include: {
                    parts: true,
                    documents: true,
                },
            }),
            prisma.maintenanceRecord.count({
                where: { vehicleID: vehicleId },
            }),
        ]);
        return { records, total };
    }
}
// 서비스 인스턴스 생성 및 내보내기
export const vehicleService = new VehicleService();
