/**
 * 차량 정비 API 모킹 핸들러
 * 차량 정비 관련 API 요청을 모의 응답으로 처리합니다.
 */

import { rest } from 'msw';

// 모의 정비 기록 데이터 가져오기
const getMockMaintenanceRecords = () => {
  const records = localStorage.getItem('mock_maintenance_records');
  return records ? JSON.parse(records) : [];
};

// 모의 정비 기록 데이터 저장
const saveMockMaintenanceRecords = (records) => {
  localStorage.setItem('mock_maintenance_records', JSON.stringify(records));
};

// 모의 차량 데이터 가져오기
const getMockVehicles = () => {
  const vehicles = localStorage.getItem('mock_vehicles');
  return vehicles ? JSON.parse(vehicles) : [];
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

export const maintenanceHandlers = [
  // GET /api/v1/maintenance/records - 정비 기록 목록 조회
  rest.get('/api/v1/maintenance/records', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const pageSize = parseInt(req.url.searchParams.get('pageSize') || '10');
    const vehicleId = req.url.searchParams.get('vehicleId');
    const status = req.url.searchParams.get('status');
    
    let records = getMockMaintenanceRecords();
    
    // 차량 ID로 필터링
    if (vehicleId) {
      records = records.filter(record => record.vehicleId === parseInt(vehicleId));
    }
    
    // 상태로 필터링
    if (status) {
      records = records.filter(record => record.status === status);
    }
    
    // 날짜순 정렬
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 페이지네이션 적용
    const result = paginateData(records, page, pageSize);
    
    return res(
      ctx.status(200),
      ctx.json(result)
    );
  }),
  
  // GET /api/v1/maintenance/records/:id - 특정 정비 기록 조회
  rest.get('/api/v1/maintenance/records/:id', (req, res, ctx) => {
    const { id } = req.params;
    const records = getMockMaintenanceRecords();
    const record = records.find(r => r.id === parseInt(id));
    
    if (!record) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 정비 기록을 찾을 수 없습니다.` })
      );
    }
    
    // 연관된 차량 정보 추가
    const vehicles = getMockVehicles();
    const vehicle = vehicles.find(v => v.id === record.vehicleId);
    
    return res(
      ctx.status(200),
      ctx.json({
        ...record,
        vehicle: vehicle || null
      })
    );
  }),
  
  // POST /api/v1/maintenance/records - 새 정비 기록 생성
  rest.post('/api/v1/maintenance/records', async (req, res, ctx) => {
    const newRecord = await req.json();
    const records = getMockMaintenanceRecords();
    const vehicles = getMockVehicles();
    
    // 필수 필드 확인
    if (!newRecord.vehicleId || !newRecord.date || !newRecord.description) {
      return res(
        ctx.status(400),
        ctx.json({ 
          detail: "유효하지 않은 정비 기록 데이터",
          errors: {
            vehicleId: !newRecord.vehicleId ? "차량 ID는 필수 항목입니다." : null,
            date: !newRecord.date ? "정비 날짜는 필수 항목입니다." : null,
            description: !newRecord.description ? "정비 설명은 필수 항목입니다." : null
          }
        })
      );
    }
    
    // 차량 존재 여부 확인
    const vehicle = vehicles.find(v => v.id === newRecord.vehicleId);
    if (!vehicle) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${newRecord.vehicleId}인 차량을 찾을 수 없습니다.` })
      );
    }
    
    // 새 정비 기록 생성
    const record = {
      id: records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1,
      ...newRecord,
      status: newRecord.status || 'scheduled',
      createdAt: new Date().toISOString()
    };
    
    records.push(record);
    saveMockMaintenanceRecords(records);
    
    return res(
      ctx.status(201),
      ctx.json(record)
    );
  }),
  
  // PUT /api/v1/maintenance/records/:id - 정비 기록 업데이트
  rest.put('/api/v1/maintenance/records/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    const records = getMockMaintenanceRecords();
    const recordIndex = records.findIndex(r => r.id === parseInt(id));
    
    if (recordIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 정비 기록을 찾을 수 없습니다.` })
      );
    }
    
    // 차량 ID가 변경된 경우 존재 확인
    if (updateData.vehicleId) {
      const vehicles = getMockVehicles();
      const vehicle = vehicles.find(v => v.id === updateData.vehicleId);
      if (!vehicle) {
        return res(
          ctx.status(404),
          ctx.json({ detail: `ID가 ${updateData.vehicleId}인 차량을 찾을 수 없습니다.` })
        );
      }
    }
    
    // 정비 기록 업데이트
    const updatedRecord = {
      ...records[recordIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    records[recordIndex] = updatedRecord;
    saveMockMaintenanceRecords(records);
    
    return res(
      ctx.status(200),
      ctx.json(updatedRecord)
    );
  }),
  
  // DELETE /api/v1/maintenance/records/:id - 정비 기록 삭제
  rest.delete('/api/v1/maintenance/records/:id', (req, res, ctx) => {
    const { id } = req.params;
    const records = getMockMaintenanceRecords();
    const recordIndex = records.findIndex(r => r.id === parseInt(id));
    
    if (recordIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({ detail: `ID가 ${id}인 정비 기록을 찾을 수 없습니다.` })
      );
    }
    
    // 정비 기록 삭제
    records.splice(recordIndex, 1);
    saveMockMaintenanceRecords(records);
    
    return res(
      ctx.status(204)
    );
  }),
  
  // GET /api/v1/maintenance/stats - 정비 통계 조회
  rest.get('/api/v1/maintenance/stats', (req, res, ctx) => {
    const records = getMockMaintenanceRecords();
    const vehicles = getMockVehicles();
    
    // 간단한 통계 계산
    const totalRecords = records.length;
    const totalCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
    const recordsByStatus = {
      scheduled: records.filter(r => r.status === 'scheduled').length,
      in_progress: records.filter(r => r.status === 'in_progress').length,
      completed: records.filter(r => r.status === 'completed').length,
      cancelled: records.filter(r => r.status === 'cancelled').length
    };
    
    // 차량별 정비 횟수
    const maintenanceByVehicle = vehicles.map(vehicle => {
      const vehicleRecords = records.filter(r => r.vehicleId === vehicle.id);
      return {
        vehicleId: vehicle.id,
        vehicleModel: vehicle.model,
        totalRecords: vehicleRecords.length,
        totalCost: vehicleRecords.reduce((sum, record) => sum + (record.cost || 0), 0)
      };
    });
    
    return res(
      ctx.status(200),
      ctx.json({
        totalRecords,
        totalCost,
        recordsByStatus,
        maintenanceByVehicle
      })
    );
  })
];