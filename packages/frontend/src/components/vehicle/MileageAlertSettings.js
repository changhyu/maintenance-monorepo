import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { PlusOutlined, DeleteOutlined, EditOutlined, BellOutlined, } from '@ant-design/icons';
import { Form, Input, Select, Button, Table, Switch, InputNumber, Space, Popconfirm, message, Card, Typography, Divider, Badge } from 'antd';
import { MileageAlertService, MileageAlertType, AlertFrequency, MileageUnit } from '../../services/mileageAlertService';
const { Option } = Select;
const { Title, Text } = Typography;
// 알림 유형별 라벨 및 설명
const alertTypeOptions = [
    {
        value: MileageAlertType.OIL_CHANGE,
        label: '오일 교체',
        description: '차량 오일 교체 시기 알림'
    },
    {
        value: MileageAlertType.TIRE_ROTATION,
        label: '타이어 교체/로테이션',
        description: '타이어 교체 또는 로테이션 시기 알림'
    },
    {
        value: MileageAlertType.AIR_FILTER,
        label: '에어필터 교체',
        description: '에어필터 교체 시기 알림'
    },
    {
        value: MileageAlertType.BRAKE_CHECK,
        label: '브레이크 점검',
        description: '브레이크 상태 점검 알림'
    },
    {
        value: MileageAlertType.REGULAR_SERVICE,
        label: '정기 점검',
        description: '차량 정기 점검 알림'
    },
    {
        value: MileageAlertType.TIMING_BELT,
        label: '타이밍 벨트 교체',
        description: '타이밍 벨트 교체 시기 알림'
    },
    {
        value: MileageAlertType.CUSTOM,
        label: '사용자 정의 알림',
        description: '사용자가 정의한 유지보수 알림'
    }
];
// 알림 빈도 옵션
const frequencyOptions = [
    { value: AlertFrequency.ONCE, label: '1회 알림' },
    { value: AlertFrequency.DAILY, label: '매일' },
    { value: AlertFrequency.WEEKLY, label: '매주' },
    { value: AlertFrequency.BIWEEKLY, label: '격주' },
    { value: AlertFrequency.MONTHLY, label: '매월' }
];
// 주행거리 단위 옵션
const mileageUnitOptions = [
    { value: MileageUnit.KILOMETERS, label: '킬로미터 (km)' },
    { value: MileageUnit.MILES, label: '마일 (miles)' }
];
const MileageAlertSettings = ({ apiClient, vehicleId, title = '주행거리 알림 설정', currentMileage, mileageUnit = MileageUnit.KILOMETERS }) => {
    const [form] = Form.useForm();
    const mileageAlertService = new MileageAlertService(apiClient);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    // 알림 목록 로드
    useEffect(() => {
        fetchAlerts();
    }, [vehicleId]);
    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const alertList = await mileageAlertService.getVehicleAlerts(vehicleId);
            setAlerts(alertList);
        }
        catch (error) {
            console.error('주행거리 알림 로드 중 오류 발생:', error);
            message.error('알림 설정을 불러오는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 폼 리셋
    const resetForm = () => {
        form.resetFields();
        setEditingAlert(null);
        setIsAdding(false);
    };
    // 알림 추가 폼 표시
    const showAddForm = () => {
        resetForm();
        form.setFieldsValue({
            alertType: MileageAlertType.OIL_CHANGE,
            mileageThreshold: 5000,
            mileageUnit: mileageUnit,
            frequency: AlertFrequency.ONCE,
            sendEmail: true,
            sendPush: true,
            sendSMS: false
        });
        setIsAdding(true);
    };
    // 알림 편집 폼 표시
    const showEditForm = (alert) => {
        resetForm();
        setEditingAlert(alert);
        form.setFieldsValue({
            alertType: alert.alertType,
            mileageThreshold: alert.mileageThreshold,
            mileageUnit: alert.mileageUnit,
            description: alert.description,
            frequency: alert.frequency,
            sendEmail: alert.sendEmail,
            sendPush: alert.sendPush,
            sendSMS: alert.sendSMS
        });
        setIsAdding(true);
    };
    // 알림 저장 처리
    const handleSave = async (values) => {
        try {
            setLoading(true);
            if (editingAlert) {
                // 기존 알림 업데이트
                await mileageAlertService.updateAlert({
                    id: editingAlert.id,
                    ...values
                });
                message.success('알림 설정이 업데이트되었습니다.');
            }
            else {
                // 새 알림 생성
                const request = {
                    vehicleId,
                    ...values
                };
                await mileageAlertService.createAlert(request);
                message.success('새 알림 설정이 생성되었습니다.');
            }
            // 목록 새로고침 및 폼 초기화
            fetchAlerts();
            resetForm();
        }
        catch (error) {
            console.error('알림 저장 중 오류 발생:', error);
            message.error('알림 설정 저장에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 알림 삭제 처리
    const handleDelete = async (alertId) => {
        try {
            setLoading(true);
            await mileageAlertService.deleteAlert(alertId);
            message.success('알림 설정이 삭제되었습니다.');
            fetchAlerts();
        }
        catch (error) {
            console.error('알림 삭제 중 오류 발생:', error);
            message.error('알림 설정 삭제에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 알림 활성화/비활성화 토글 처리
    const handleToggleActive = async (alert) => {
        try {
            setLoading(true);
            await mileageAlertService.toggleAlertActive(alert.id, !alert.isActive);
            message.success(`알림이 ${!alert.isActive ? '활성화' : '비활성화'}되었습니다.`);
            fetchAlerts();
        }
        catch (error) {
            console.error('알림 활성화 상태 변경 중 오류 발생:', error);
            message.error('알림 상태 변경에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 기본 알림 생성 처리
    const handleCreateDefaultAlerts = async () => {
        try {
            setLoading(true);
            await mileageAlertService.createDefaultAlerts(vehicleId);
            message.success('기본 알림 설정이 생성되었습니다.');
            fetchAlerts();
        }
        catch (error) {
            console.error('기본 알림 생성 중 오류 발생:', error);
            message.error('기본 알림 설정 생성에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 테이블 컬럼 정의
    const columns = [
        {
            title: '알림 유형',
            dataIndex: 'alertType',
            key: 'alertType',
            render: (type) => {
                const option = alertTypeOptions.find(opt => opt.value === type);
                return option ? option.label : type;
            }
        },
        {
            title: '설명',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: '주행거리 기준',
            key: 'mileage',
            render: (_, record) => {
                const unit = record.mileageUnit === MileageUnit.KILOMETERS ? 'km' : 'miles';
                return `${record.mileageThreshold.toLocaleString()} ${unit}`;
            }
        },
        {
            title: '알림 빈도',
            dataIndex: 'frequency',
            key: 'frequency',
            render: (frequency) => {
                const option = frequencyOptions.find(opt => opt.value === frequency);
                return option ? option.label : frequency;
            }
        },
        {
            title: '알림 채널',
            key: 'channels',
            render: (_, record) => {
                const channels = [];
                if (record.sendEmail) {
                    channels.push('Email');
                }
                if (record.sendSMS) {
                    channels.push('SMS');
                }
                if (record.sendPush) {
                    channels.push('Push');
                }
                return channels.join(', ');
            }
        },
        {
            title: '상태',
            key: 'status',
            render: (_, record) => {
                const value = record.isActive ? '활성' : '비활성';
                return (_jsx(Badge, { status: record.isActive ? 'success' : 'default', text: value }));
            }
        },
        {
            title: '활성화',
            key: 'isActive',
            render: (_, record) => (_jsx(Switch, { checked: record.isActive, onChange: () => handleToggleActive(record), loading: loading }))
        },
        {
            title: '액션',
            key: 'action',
            render: (_, record) => (_jsxs(Space, { size: "middle", children: [_jsx(Button, { type: "text", icon: _jsx(EditOutlined, {}), onClick: () => showEditForm(record) }), _jsx(Popconfirm, { title: "\uC815\uB9D0 \uC774 \uC54C\uB9BC\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", onConfirm: () => handleDelete(record.id), okText: "\uC0AD\uC81C", cancelText: "\uCDE8\uC18C", children: _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}) }) })] }))
        }
    ];
    return (_jsx("div", { className: "mileage-alert-settings", children: _jsxs(Card, { title: title, children: [_jsxs("div", { className: "mb-4 flex justify-between items-center", children: [_jsxs(Space, { children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: showAddForm, children: "\uC54C\uB9BC \uCD94\uAC00" }), _jsx(Button, { onClick: handleCreateDefaultAlerts, icon: _jsx(BellOutlined, {}), children: "\uAE30\uBCF8 \uC54C\uB9BC \uC0DD\uC131" })] }), currentMileage !== undefined && (_jsxs(Text, { children: ["\uD604\uC7AC \uC8FC\uD589\uAC70\uB9AC:", ' ', _jsxs("strong", { children: [currentMileage.toLocaleString(), ' ', mileageUnit === MileageUnit.KILOMETERS ? 'km' : 'miles'] })] }))] }), _jsx(Table, { dataSource: alerts, columns: columns, rowKey: "id", loading: loading, pagination: false }), isAdding && (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsx(Card, { title: editingAlert ? '알림 수정' : '알림 추가', type: "inner", children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSave, children: [_jsx(Form.Item, { name: "alertType", label: "\uC54C\uB9BC \uC720\uD615", rules: [{ required: true, message: '알림 유형을 선택해주세요' }], children: _jsx(Select, { children: alertTypeOptions.map(option => (_jsxs(Option, { value: option.value, children: [option.label, " - ", option.description] }, option.value))) }) }), _jsx(Form.Item, { name: "description", label: "\uC54C\uB9BC \uC124\uBA85", rules: [{ required: true, message: '알림 설명을 입력해주세요' }], children: _jsx(Input, { placeholder: "\uC608: \uC5D4\uC9C4 \uC624\uC77C \uAD50\uCCB4 \uC2DC\uAE30\uC785\uB2C8\uB2E4" }) }), _jsx(Form.Item, { name: "mileageThreshold", label: "\uC8FC\uD589\uAC70\uB9AC \uAE30\uC900", rules: [{ required: true, message: '주행거리 기준을 입력해주세요' }], children: _jsx(InputNumber, { min: 1, step: 100, style: { width: '100%' }, formatter: (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','), parser: (value) => {
                                                const parsed = value?.replace(/\$\s?|(,*)/g, '');
                                                return parsed ? Number(parsed) : 0;
                                            } }) }), _jsx(Form.Item, { name: "mileageUnit", label: "\uC8FC\uD589\uAC70\uB9AC \uB2E8\uC704", rules: [{ required: true, message: '주행거리 단위를 선택해주세요' }], children: _jsx(Select, { children: mileageUnitOptions.map(option => (_jsx(Option, { value: option.value, children: option.label }, option.value))) }) }), _jsx(Form.Item, { name: "frequency", label: "\uC54C\uB9BC \uBE48\uB3C4", rules: [{ required: true, message: '알림 빈도를 선택해주세요' }], children: _jsx(Select, { children: frequencyOptions.map(option => (_jsx(Option, { value: option.value, children: option.label }, option.value))) }) }), _jsx(Form.Item, { label: "\uC54C\uB9BC \uCC44\uB110", children: _jsxs(Space, { direction: "vertical", children: [_jsx(Form.Item, { name: "sendEmail", valuePropName: "checked", noStyle: true, children: _jsx(Switch, { checkedChildren: "\uC774\uBA54\uC77C", unCheckedChildren: "\uC774\uBA54\uC77C" }) }), _jsx(Form.Item, { name: "sendSMS", valuePropName: "checked", noStyle: true, children: _jsx(Switch, { checkedChildren: "SMS", unCheckedChildren: "SMS" }) }), _jsx(Form.Item, { name: "sendPush", valuePropName: "checked", noStyle: true, children: _jsx(Switch, { checkedChildren: "\uC571 \uC54C\uB9BC", unCheckedChildren: "\uC571 \uC54C\uB9BC" }) })] }) }), _jsx(Form.Item, { children: _jsxs(Space, { children: [_jsx(Button, { type: "primary", htmlType: "submit", loading: loading, children: "\uC800\uC7A5" }), _jsx(Button, { onClick: resetForm, children: "\uCDE8\uC18C" })] }) })] }) })] }))] }) }));
};
export default MileageAlertSettings;
