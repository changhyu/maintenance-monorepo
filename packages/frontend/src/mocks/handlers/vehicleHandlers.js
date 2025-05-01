/**
 * 차량 API 모킹 핸들러
 * 차량 관련 API 요청을 모의 응답으로 처리합니다.
 */

import { rest } from 'msw';

// 모의 차량 데이터 가져오기
const getMockVehicles = () => {
  const vehicles = localStorage.getItem('mock_vehicles');
  return vehicles ? JSON.parse(vehicles) : [];
};

// 모의 차량 데이터 저장
const saveMockVehicles = (vehicles) => {
  localStorage.setItem('mock_vehicles', JSON.stringify(vehicles));
};

// 모의 정비 기록 데이터 가져오기
const getMockMaintenanceRecords = () => {
  const records = localStorage.getItem('mock_maintenance_records');
  return records ? JSON.parse(records) : [];
};

// 페이지네이션 처리 함수
const paginateData = (data, page = 1, pageSize = 10) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    items: paginatedData,
    total: data.length,
    page: page,
    pageSize: pageSize,
    totalPages: Math.ceil(data.length / pageSize)
  };
};

export const vehicleHandlers = [
  // GET /api/v1/vehicles - 차량 목록 조회
  rest.get('/api/v1/vehicles', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10');
    const search = req.url.searchParams.get('search') || '';
    const status = req.url.searchParams.get('status');
    
    let vehicles = getMockVehicles();
    
    // 검색어가 있는 경우 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      vehicles = vehicles.filter(vehicle => 
        vehicle.model?.toLowerCase().includes(searchLower) ||
        vehicle.vin?.toLowerCase().includes(searchLower)
      );
    }
    
    // 상태로 필터링
    if (status) {
      vehicles = vehicles.filter(vehicle => vehicle.status === status);
    }
    
    // 페이지네이션 적용
    const result = paginateData(vehicles, page, pageSize);
    
    return res(
      ctx.status(200),
      ctx.json(result)
    );
  }),
  
  // GET /api/v1/vehicles/:id - 특정 차량 조회
  rest.get('/api/v1/vehicles/:id', (req, res, ctx) => {
    const { id } = req.params;
    const vehicles = getMockVehicles();
    const vehicle = vehicles.find(v => v.id === parseInt(id));
    
    if (!vehicle) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 차량을 찾을 수 없습니다.` })
      );
    }
    
    // 관련 정비 기록 조회
    const maintenanceRecords = getMockMaintenanceRecords()
      .filter(record => record.vehicleId === parseInt(id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return res(
      ctx.status(200),
      ctx.json({
        ...vehicle,
        maintenanceRecords: maintenanceRecords.slice(0, 5) // 최신 5개만 포함
      })
    );
  }),
  
  // POST /api/v1/vehicles - 새 차량 등록
  rest.post('/api/v1/vehicles', async (req, res, ctx) => {
    const newVehicle = await req.json();
    const vehicles = getMockVehicles();
    
    // 필수 필드 확인
    if (!newVehicle.model || !newVehicle.vin) {
      return res(
        ctx.status(400),
        ctx.json({ 
          detail: "유효하지 않은 차량 데이터",
          errors: {
            model: !newVehicle.model ? "차량 모델은 필수 항목입니다." : null,
            vin: !newVehicle.vin ? "VIN은 필수 항목입니다." : null
          }
        })
      );
    }
    
    // VIN 중복 확인
    if (vehicles.some(v => v.vin === newVehicle.vin)) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이미 등록된 VIN입니다." })
      );
    }
    
    // 새 차량 생성
    const vehicle = {
      id: vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1,
      ...newVehicle,
      status: newVehicle.status || 'active',
      createdAt: new Date().toISOString()
    };
    
    vehicles.push(vehicle);
    saveMockVehicles(vehicles);
    
    return res(
      ctx.status(201),
      ctx.json(vehicle)
    );
  }),
  
  // PUT /api/v1/vehicles/:id - 차량 정보 업데이트
  rest.put('/api/v1/vehicles/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    const vehicles = getMockVehicles();
    const vehicleIndex = vehicles.findIndex(v => v.id === parseInt(id));
    
    if (vehicleIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 차량을 찾을 수 없습니다.` })
      );
    }
    
    // VIN 변경 시 중복 확인
    if (updateData.vin && 
        vehicles.some(v => v.vin === updateData.vin && v.id !== parseInt(id))) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이미 등록된 VIN입니다." })
      );
    }
    
    // 차량 정보 업데이트
    const updatedVehicle = {
      ...vehicles[vehicleIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    vehicles[vehicleIndex] = updatedVehicle;
    saveMockVehicles(vehicles);
    
    return res(
      ctx.status(200),
      ctx.json(updatedVehicle)
    );
  }),
  
  // DELETE /api/v1/vehicles/:id - 차량 삭제
  rest.delete('/api/v1/vehicles/:id', (req, res, ctx) => {
    const { id } = req.params;
    const vehicles = getMockVehicles();
    const vehicleIndex = vehicles.findIndex(v => v.id === parseInt(id));
    
    if (vehicleIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 차량을 찾을 수 없습니다.` })
      );
    }
    
    // 관련 정비 기록 확인
    const maintenanceRecords = getMockMaintenanceRecords();
    const hasMaintenanceRecords = maintenanceRecords.some(record => record.vehicleId === parseInt(id));
    
    // 정비 기록이 있는 경우 삭제 금지
    if (hasMaintenanceRecords) {
      return res(
        ctx.status(409),
        ctx.json({ detail: "이 차량에 연결된 정비 기록이 있어 삭제할 수 없습니다." })
      );
    }
    
    // 차량 삭제
    vehicles.splice(vehicleIndex, 1);
    saveMockVehicles(vehicles);
    
    return res(
      ctx.status(204)
    );
  }),
  
  // GET /api/v1/vehicles/stats - 차량 통계 조회
  rest.get('/api/v1/vehicles/stats', (req, res, ctx) => {
    const vehicles = getMockVehicles();
    const maintenanceRecords = getMockMaintenanceRecords();
    
    // 상태별 차량 수
    const vehiclesByStatus = {
      active: vehicles.filter(v => v.status === 'active').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      inactive: vehicles.filter(v => v.status === 'inactive').length
    };
    
    // 연식별 차량 수
    const vehiclesByYear = {};
    vehicles.forEach(vehicle => {
      if (vehicle.year) {
        vehiclesByYear[vehicle.year] = (vehiclesByYear[vehicle.year] || 0) + 1;
      }
    });
    
    // 모델별 차량 수
    const vehiclesByModel = {};
    vehicles.forEach(vehicle => {
      if (vehicle.model) {
        vehiclesByModel[vehicle.model] = (vehiclesByModel[vehicle.model] || 0) + 1;
      }
    });
    
    // 차량별 정비 비용
    const maintenanceCostByVehicle = vehicles.map(vehicle => {
      const vehicleRecords = maintenanceRecords.filter(r => r.vehicleId === vehicle.id);
      return {
        vehicleId: vehicle.id,
        model: vehicle.model,
        vin: vehicle.vin,
        totalCost: vehicleRecords.reduce((sum, record) => sum + (record.cost || 0), 0),
        recordCount: vehicleRecords.length
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
    
    return res(
      ctx.status(200),
      ctx.json({
        totalVehicles: vehicles.length,
        vehiclesByStatus,
        vehiclesByYear,
        vehiclesByModel,
        maintenanceCostByVehicle
      })
    );
  })
];