import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { maintenanceService } from '../../services/maintenance';
import { vehicleService, Vehicle as VehicleType } from '../../services/vehicle';
import {
  MaintenanceRecord,
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenancePart,
  MaintenanceDocument
} from '../../types/maintenance';
import { getTodayString } from '../../utils/dateUtils';

interface MaintenanceFormProps {
  initialData?: Partial<MaintenanceRecord>;
  vehicleId?: string;
  onSubmit?: (data: MaintenanceRecord) => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  initialData,
  vehicleId,
  onSubmit,
  onCancel,
  isEdit = false
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
    type: MaintenanceType.REGULAR,
    title: '',
    description: '',
    status: MaintenanceStatus.SCHEDULED,
    priority: MaintenancePriority.MEDIUM,
    startDate: getTodayString(),
    mileage: 0,
    cost: 0,
    technicianName: '',
    shopName: '',
    notes: '',
    parts: [],
    documents: [],
    ...initialData
  });

  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newPart, setNewPart] = useState<Partial<MaintenancePart>>({
    name: '',
    partNumber: '',
    quantity: 1,
    unitCost: 0,
    totalCost: 0
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      if (vehicleId || initialData?.vehicleId) {
        setIsLoading(true);
        try {
          const data = await vehicleService.getVehicleById(
            vehicleId ?? (initialData?.vehicleId as string)
          );
          if (data) {
            setVehicle(data);
            if (!initialData?.vehicleId && data.id) {
              setFormData(prev => ({ ...prev, vehicleId: data.id }));
            }
          }
        } catch (err) {
          setError('차량 정보를 불러오는데 실패했습니다.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchVehicle();
  }, [vehicleId, initialData?.vehicleId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPart(prev => {
      const updated = {
        ...prev,
        [name]: name === 'quantity' || name === 'unitCost' ? Number(value) : value
      };

      // 수량이나 단가가 변경되면 총 비용 자동 계산
      if (name === 'quantity' || name === 'unitCost') {
        const quantity = name === 'quantity' ? Number(value) : (prev.quantity ?? 0);
        const unitCost = name === 'unitCost' ? Number(value) : (prev.unitCost ?? 0);
        updated.totalCost = quantity * unitCost;
      }

      return updated;
    });
  };

  const addPart = () => {
    if (!newPart.name || !newPart.quantity || !newPart.unitCost) {
      setError('부품 이름, 수량, 단가를 모두 입력해주세요.');
      return;
    }

    const partToAdd = {
      ...newPart,
      id: `temp-${Date.now()}`, // 임시 ID
      quantity: Number(newPart.quantity),
      unitCost: Number(newPart.unitCost),
      totalCost: Number(newPart.quantity) * Number(newPart.unitCost)
    } as MaintenancePart;

    setFormData(prev => ({
      ...prev,
      parts: [...(prev.parts || []), partToAdd],
      cost: (prev.cost ?? 0) + partToAdd.totalCost
    }));

    setNewPart({
      name: '',
      partNumber: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0
    });
  };

  const removePart = (id: string) => {
    const partToRemove = formData.parts?.find(part => part.id === id);
    if (!partToRemove) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      parts: prev.parts?.filter(part => part.id !== id),
      cost: (prev.cost ?? 0) - partToRemove.totalCost
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const uploadDocument = async () => {
    if (!fileToUpload) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && formData.id) {
        // 기존 정비 기록에 문서 추가
        const result = await maintenanceService.attachDocument(formData.id, fileToUpload);
        if (result) {
          setFormData(prev => ({
            ...prev,
            documents: [...(prev.documents ?? []), result]
          }));
        }
      } else {
        // 아직 저장되지 않은 폼에는 임시로 문서 추가
        const tempDoc: MaintenanceDocument = {
          id: `temp-${Date.now()}`,
          name: fileToUpload.name,
          fileUrl: URL.createObjectURL(fileToUpload),
          uploadedAt: new Date().toISOString(),
          size: fileToUpload.size,
          type: fileToUpload.type
        };

        setFormData(prev => ({
          ...prev,
          documents: [...(prev.documents ?? []), tempDoc]
        }));
      }

      setFileToUpload(null);
      // 파일 입력 필드 초기화
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError('문서 업로드에 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeDocument = async (docId: string) => {
    if (isEdit && formData.id) {
      try {
        const result = await maintenanceService.removeDocument(formData.id, docId);
        if (result) {
          setFormData(prev => ({
            ...prev,
            documents: prev.documents?.filter(doc => doc.id !== docId)
          }));
        }
      } catch (err) {
        setError('문서 삭제에 실패했습니다.');
        console.error(err);
      }
    } else {
      // 아직 저장되지 않은 상태에서는 그냥 목록에서 제거
      setFormData(prev => ({
        ...prev,
        documents: prev.documents?.filter(doc => doc.id !== docId)
      }));
    }
  };

  // isEdit에 따라 적절한 서비스 함수를 호출하는 함수
  const saveMaintenanceRecord = async () => {
    let result;
    if (isEdit && formData.id) {
      // 기존 정비 기록 업데이트
      const { id, vehicle, createdAt, updatedAt, ...updateData } = formData as MaintenanceRecord;
      result = await maintenanceService.updateMaintenanceRecord(id, updateData);
    } else {
      // 새 정비 기록 생성
      const { id, vehicle, createdAt, updatedAt, ...createData } = formData as MaintenanceRecord;
      result = await maintenanceService.createMaintenanceRecord(createData);
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId || !formData.title || !formData.description || !formData.startDate) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await saveMaintenanceRecord();

      if (onSubmit && result) {
        onSubmit(result);
      } else if (result) {
        navigate(`/maintenance/${result.id}`);
      }
    } catch (err) {
      setError('정비 기록 저장에 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalCost = (): number => {
    const partsCost = formData.parts?.reduce((sum, part) => sum + part.totalCost, 0) ?? 0;
    const laborCost = formData.cost ?? 0;
    return partsCost + laborCost;
  };

  // 라벨과 입력 필드를 연결하기 위한 고유 ID 생성
  const getLabelId = (fieldName: string): string => {
    return `maintenance-${fieldName}`;
  };

  // 버튼 텍스트를 결정하는 함수
  const getSubmitButtonText = (): string => {
    if (isLoading) {
      return '처리 중...';
    }
    return isEdit ? '수정' : '저장';
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">{isEdit ? '정비 기록 수정' : '새 정비 기록'}</h2>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {isLoading && !vehicle && (
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {vehicle && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">차량 정보</h3>
          <p>
            {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('type')}>정비 유형*</label>
            <select
              id={getLabelId('type')}
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              {Object.values(MaintenanceType).map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('status')}>상태*</label>
            <select
              id={getLabelId('status')}
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              {Object.values(MaintenanceStatus).map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('title')}>제목*</label>
          <input
            id={getLabelId('title')}
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('description')}>설명*</label>
          <textarea
            id={getLabelId('description')}
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('startDate')}>시작일*</label>
            <input
              id={getLabelId('startDate')}
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('endDate')}>종료일</label>
            <input
              id={getLabelId('endDate')}
              type="date"
              name="endDate"
              value={formData.endDate ?? ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('mileage')}>주행거리 (km)*</label>
            <input
              id={getLabelId('mileage')}
              type="number"
              name="mileage"
              value={formData.mileage}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('technicianName')}>담당 기술자</label>
            <input
              id={getLabelId('technicianName')}
              type="text"
              name="technicianName"
              value={formData.technicianName ?? ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('shopName')}>정비소</label>
            <input
              id={getLabelId('shopName')}
              type="text"
              name="shopName"
              value={formData.shopName ?? ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('priority')}>우선순위</label>
            <select
              id={getLabelId('priority')}
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              {Object.values(MaintenancePriority).map(priority => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('cost')}>인건비 (원)</label>
          <input
            id={getLabelId('cost')}
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={getLabelId('notes')}>메모</label>
          <textarea
            id={getLabelId('notes')}
            name="notes"
            value={formData.notes ?? ''}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* 부품 관리 섹션 */}
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">부품</h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
            <div className="md:col-span-2">
              <input
                type="text"
                name="name"
                value={newPart.name}
                onChange={handlePartChange}
                placeholder="부품 이름"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <input
                type="text"
                name="partNumber"
                value={newPart.partNumber}
                onChange={handlePartChange}
                placeholder="부품 번호"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <input
                type="number"
                name="quantity"
                value={newPart.quantity}
                onChange={handlePartChange}
                placeholder="수량"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <input
                type="number"
                name="unitCost"
                value={newPart.unitCost}
                onChange={handlePartChange}
                placeholder="단가"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={addPart}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              부품 추가
            </button>
          </div>

          {formData.parts && formData.parts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">부품명</th>
                    <th className="p-2 text-left">부품 번호</th>
                    <th className="p-2 text-right">수량</th>
                    <th className="p-2 text-right">단가</th>
                    <th className="p-2 text-right">총액</th>
                    <th className="p-2 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.parts.map(part => (
                    <tr key={part.id} className="border-t">
                      <td className="p-2">{part.name}</td>
                      <td className="p-2">{part.partNumber ?? '-'}</td>
                      <td className="p-2 text-right">{part.quantity}</td>
                      <td className="p-2 text-right">{part.unitCost.toLocaleString()}원</td>
                      <td className="p-2 text-right">{part.totalCost.toLocaleString()}원</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removePart(part.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold">
                    <td colSpan={4} className="p-2 text-right">
                      총 부품비:
                    </td>
                    <td className="p-2 text-right">
                      {formData.parts
                        .reduce((sum, part) => sum + part.totalCost, 0)
                        .toLocaleString()}
                      원
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 my-4">등록된 부품이 없습니다.</p>
          )}
        </div>

        {/* 문서 업로드 섹션 */}
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">문서</h3>

          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              className="flex-grow p-2 border rounded"
            />
            <button
              type="button"
              onClick={uploadDocument}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!fileToUpload}
            >
              업로드
            </button>
          </div>

          {formData.documents && formData.documents.length > 0 ? (
            <ul className="divide-y">
              {formData.documents.map(doc => (
                <li key={doc.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{doc.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({Math.round(doc.size / 1024)} KB)
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      보기
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 my-4">등록된 문서가 없습니다.</p>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="font-semibold text-lg">
            총 비용: {calculateTotalCost().toLocaleString()}원
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel ?? (() => navigate(-1))}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isLoading}
            >
              {getSubmitButtonText()}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MaintenanceForm;
