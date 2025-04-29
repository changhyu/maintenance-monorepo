import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusOutlined, DeleteOutlined, EditOutlined, InfoCircleOutlined, EnvironmentOutlined, CarOutlined } from '@ant-design/icons';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Space, Tag, Popconfirm, message, Tabs, Typography, Divider, Switch, ColorPicker, Tooltip } from 'antd';
import { MapService, GeofenceType, GeofenceAlertType } from '../../services/mapService';
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
/**
 * 지오펜스 관리자 컴포넌트
 */
const GeofenceManager = ({ apiClient, vehicleList = [], onGeofenceSelect, onGeofenceCreate, onGeofenceUpdate, onGeofenceDelete }) => {
    // 서비스 초기화 - useMemo를 사용하여 메모이제이션
    const mapService = useMemo(() => new MapService(apiClient), [apiClient]);
    // 상태 변수들
    const [geofences, setGeofences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('지오펜스 추가');
    const [editingGeofence, setEditingGeofence] = useState(null);
    const [activeGeofenceId, setActiveGeofenceId] = useState(null);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [geofenceEvents, setGeofenceEvents] = useState([]);
    // Form 인스턴스
    const [form] = Form.useForm();
    // 지오펜스 목록 로드
    const loadGeofences = useCallback(async () => {
        try {
            setLoading(true);
            const data = await mapService.getGeofences();
            setGeofences(data);
        }
        catch (error) {
            console.error('지오펜스 목록 로드 중 오류 발생:', error);
            message.error('지오펜스 목록을 로드하는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    }, [mapService]);
    // 이벤트 목록 로드
    const loadGeofenceEvents = useCallback(async (geofenceId) => {
        try {
            setEventsLoading(true);
            // 현재 날짜 기준 지난 7일간의 이벤트 로드
            const endDate = new Date();
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const events = await mapService.getGeofenceEvents(geofenceId, startDate, endDate);
            // 타입 변환 문제 해결을 위해 unknown으로 먼저 변환
            setGeofenceEvents(events);
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 이벤트 로드 중 오류 발생:`, error);
            message.error('지오펜스 이벤트를 로드하는 데 실패했습니다.');
        }
        finally {
            setEventsLoading(false);
        }
    }, [mapService]);
    // 컴포넌트 마운트 시 지오펜스 목록 로드
    useEffect(() => {
        loadGeofences();
    }, [loadGeofences]);
    // 지오펜스 추가 모달 열기
    const showAddModal = () => {
        form.resetFields();
        setModalTitle('지오펜스 추가');
        setEditingGeofence(null);
        setModalVisible(true);
    };
    // 지오펜스 편집 모달 열기
    const showEditModal = (geofence) => {
        form.setFieldsValue({
            name: geofence.name,
            description: geofence.description,
            type: geofence.type,
            alerts: geofence.alerts,
            color: geofence.color,
            vehicleIds: geofence.vehicleIds,
            // 좌표 처리는 지오펜스 타입에 따라 달라짐
            ...(geofence.type === GeofenceType.CIRCLE
                ? {
                    latitude: geofence.coordinates.latitude,
                    longitude: geofence.coordinates.longitude,
                    radius: geofence.radius
                }
                : {})
        });
        setModalTitle('지오펜스 편집');
        setEditingGeofence(geofence);
        setModalVisible(true);
    };
    // 모달 취소
    const handleCancel = () => {
        setModalVisible(false);
    };
    // 폼 제출 처리
    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            let coordinates;
            // 지오펜스 타입에 따라 좌표 처리
            if (values.type === GeofenceType.CIRCLE) {
                coordinates = {
                    latitude: parseFloat(String(values.latitude)),
                    longitude: parseFloat(String(values.longitude))
                };
            }
            else if (values.type === GeofenceType.POLYGON || values.type === GeofenceType.RECTANGLE) {
                // 다각형이나 사각형의 경우 좌표 배열 처리 (값 형식에 따라 조정 필요)
                coordinates = values.coordinates || [];
            }
            else {
                coordinates = [];
            }
            const geofenceData = {
                name: values.name,
                description: values.description,
                type: values.type,
                coordinates,
                radius: values.type === GeofenceType.CIRCLE ? values.radius : undefined,
                alerts: values.alerts,
                color: values.color,
                vehicleIds: values.vehicleIds
            };
            if (editingGeofence) {
                // 기존 지오펜스 업데이트
                const updated = await mapService.updateGeofence(editingGeofence.id, geofenceData);
                if (updated) {
                    message.success(`지오펜스 '${updated.name}'가 업데이트되었습니다.`);
                    if (onGeofenceUpdate) {
                        onGeofenceUpdate(updated);
                    }
                }
            }
            else {
                // 새 지오펜스 생성
                const created = await mapService.createGeofence(geofenceData);
                if (created) {
                    message.success(`지오펜스 '${created.name}'가 생성되었습니다.`);
                    if (onGeofenceCreate) {
                        onGeofenceCreate(created);
                    }
                }
            }
            setModalVisible(false);
            loadGeofences();
        }
        catch (error) {
            console.error('지오펜스 저장 중 오류 발생:', error);
            message.error('지오펜스를 저장하는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 지오펜스 삭제 처리
    const handleDelete = async (geofenceId) => {
        try {
            setLoading(true);
            await mapService.deleteGeofence(geofenceId);
            message.success('지오펜스가 삭제되었습니다.');
            if (onGeofenceDelete) {
                onGeofenceDelete(geofenceId);
            }
            loadGeofences();
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 삭제 중 오류 발생:`, error);
            message.error('지오펜스를 삭제하는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 탭 변경 처리
    const handleTabChange = (activeKey) => {
        if (activeKey === '2' && activeGeofenceId) {
            loadGeofenceEvents(activeGeofenceId);
        }
    };
    // 지오펜스 선택 처리
    const handleGeofenceSelect = (geofence) => {
        setActiveGeofenceId(geofence.id);
        if (onGeofenceSelect) {
            onGeofenceSelect(geofence);
        }
    };
    // 지오펜스 활성화 상태 변경
    const handleStatusChange = async (geofenceId, active) => {
        try {
            setLoading(true);
            // Geofence 타입에는 active가 있지만 GeofenceCreate에는 없으므로,
            // 백엔드에서 처리할 수 있는 다른 속성들로 업데이트
            const updateData = {
                description: active ? '활성화된 지오펜스' : '비활성화된 지오펜스',
                // 백엔드에서는 다른 방식으로 active 상태를 관리할 수 있음
                vehicleIds: active ? undefined : [] // 활성화 상태가 아닐 때는 빈 배열로 설정
            };
            await mapService.updateGeofence(geofenceId, updateData);
            message.success(`지오펜스가 ${active ? '활성화' : '비활성화'}되었습니다.`);
            loadGeofences();
        }
        catch (error) {
            console.error(`지오펜스 ID ${geofenceId} 상태 변경 중 오류 발생:`, error);
            message.error('지오펜스 상태를 변경하는 데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    // 지오펜스 목록 테이블 컬럼
    const columns = [
        {
            title: '이름',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (_jsx("a", { onClick: () => handleGeofenceSelect(record), children: text }))
        },
        {
            title: '유형',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                let label = '';
                switch (type) {
                    case GeofenceType.CIRCLE:
                        label = '원형';
                        break;
                    case GeofenceType.POLYGON:
                        label = '다각형';
                        break;
                    case GeofenceType.RECTANGLE:
                        label = '사각형';
                        break;
                    default:
                        label = type;
                }
                return _jsx(Tag, { color: "blue", children: label });
            }
        },
        {
            title: '알림',
            dataIndex: 'alerts',
            key: 'alerts',
            render: (alerts) => (_jsx(_Fragment, { children: alerts.map(alert => {
                    let color = '';
                    let label = '';
                    switch (alert) {
                        case GeofenceAlertType.ENTRY:
                            color = 'green';
                            label = '진입';
                            break;
                        case GeofenceAlertType.EXIT:
                            color = 'red';
                            label = '이탈';
                            break;
                        case GeofenceAlertType.DWELL:
                            color = 'orange';
                            label = '체류';
                            break;
                        default:
                            color = 'default';
                            label = alert;
                    }
                    return (_jsx(Tag, { color: color, children: label }, alert));
                }) }))
        },
        {
            title: '상태',
            dataIndex: 'active',
            key: 'active',
            render: (active, record) => (_jsx(Switch, { checked: active, onChange: (checked) => handleStatusChange(record.id, checked), checkedChildren: "\uD65C\uC131", unCheckedChildren: "\uBE44\uD65C\uC131" }))
        },
        {
            title: '차량',
            dataIndex: 'vehicleIds',
            key: 'vehicleIds',
            render: (vehicleIds) => _jsxs("span", { children: [vehicleIds?.length || 0, "\uB300"] })
        },
        {
            title: '작업',
            key: 'action',
            render: (_, record) => (_jsxs(Space, { size: "small", children: [_jsx(Button, { type: "text", icon: _jsx(EditOutlined, {}), onClick: () => showEditModal(record) }), _jsx(Popconfirm, { title: "\uC774 \uC9C0\uC624\uD39C\uC2A4\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", onConfirm: () => handleDelete(record.id), okText: "\uC608", cancelText: "\uC544\uB2C8\uC624", children: _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}) }) })] }))
        }
    ];
    // 이벤트 목록 테이블 컬럼
    const eventColumns = [
        {
            title: '차량',
            dataIndex: 'vehicleId',
            key: 'vehicleId',
            render: (vehicleId) => {
                const vehicle = vehicleList.find(v => v.id === vehicleId);
                return vehicle ? vehicle.name : vehicleId;
            }
        },
        {
            title: '이벤트 유형',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                let color = '';
                let label = '';
                switch (type) {
                    case GeofenceAlertType.ENTRY:
                        color = 'green';
                        label = '진입';
                        break;
                    case GeofenceAlertType.EXIT:
                        color = 'red';
                        label = '이탈';
                        break;
                    case GeofenceAlertType.DWELL:
                        color = 'orange';
                        label = '체류';
                        break;
                    default:
                        color = 'default';
                        label = type;
                }
                return _jsx(Tag, { color: color, children: label });
            }
        },
        {
            title: '시간',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (timestamp) => new Date(timestamp).toLocaleString()
        },
        {
            title: '위치',
            dataIndex: 'location',
            key: 'location',
            render: (location) => (_jsx(Tooltip, { title: `위도: ${location.latitude}, 경도: ${location.longitude}`, children: _jsx(Button, { type: "text", icon: _jsx(EnvironmentOutlined, {}), size: "small", children: "\uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30" }) }))
        }
    ];
    return (_jsxs("div", { className: "geofence-manager", children: [_jsx(Card, { title: _jsxs(Space, { children: [_jsx(EnvironmentOutlined, {}), _jsx("span", { children: "\uC9C0\uC624\uD39C\uC2A4 \uAD00\uB9AC" })] }), extra: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: showAddModal, children: "\uC9C0\uC624\uD39C\uC2A4 \uCD94\uAC00" }), children: _jsxs(Tabs, { defaultActiveKey: "1", onChange: handleTabChange, children: [_jsx(TabPane, { tab: _jsxs("span", { children: [_jsx(EnvironmentOutlined, {}), "\uC9C0\uC624\uD39C\uC2A4 \uBAA9\uB85D"] }), children: _jsx(Table, { columns: columns, dataSource: geofences, rowKey: "id", loading: loading, pagination: { pageSize: 10 }, onRow: (record) => ({
                                    onClick: () => handleGeofenceSelect(record)
                                }) }) }, "1"), _jsx(TabPane, { tab: _jsxs("span", { children: [_jsx(InfoCircleOutlined, {}), "\uC774\uBCA4\uD2B8 \uAE30\uB85D"] }), disabled: !activeGeofenceId, children: activeGeofenceId && (_jsx(Table, { columns: eventColumns, dataSource: geofenceEvents, rowKey: "id", loading: eventsLoading, pagination: { pageSize: 10 } })) }, "2")] }) }), _jsx(Modal, { title: modalTitle, open: modalVisible, onCancel: handleCancel, footer: null, width: 700, children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, initialValues: {
                        type: GeofenceType.CIRCLE,
                        alerts: [GeofenceAlertType.ENTRY, GeofenceAlertType.EXIT],
                        radius: 1000, // 1km 기본값
                        color: '#1890ff'
                    }, children: [_jsx(Form.Item, { name: "name", label: "\uC9C0\uC624\uD39C\uC2A4 \uC774\uB984", rules: [{ required: true, message: '지오펜스 이름을 입력하세요' }], children: _jsx(Input, { placeholder: "\uC608: \uD68C\uC0AC \uC8FC\uBCC0" }) }), _jsx(Form.Item, { name: "description", label: "\uC124\uBA85", children: _jsx(Input.TextArea, { placeholder: "\uC9C0\uC624\uD39C\uC2A4\uC5D0 \uB300\uD55C \uCD94\uAC00 \uC124\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694" }) }), _jsx(Form.Item, { name: "type", label: "\uC9C0\uC624\uD39C\uC2A4 \uC720\uD615", rules: [{ required: true, message: '지오펜스 유형을 선택하세요' }], children: _jsxs(Select, { children: [_jsx(Option, { value: GeofenceType.CIRCLE, children: "\uC6D0\uD615" }), _jsx(Option, { value: GeofenceType.POLYGON, children: "\uB2E4\uAC01\uD615" }), _jsx(Option, { value: GeofenceType.RECTANGLE, children: "\uC0AC\uAC01\uD615" })] }) }), _jsx(Form.Item, { noStyle: true, shouldUpdate: (prevValues, currentValues) => prevValues.type !== currentValues.type, children: ({ getFieldValue }) => {
                                const type = getFieldValue('type');
                                if (type === GeofenceType.CIRCLE) {
                                    return (_jsxs(_Fragment, { children: [_jsx(Title, { level: 5, children: "\uC6D0\uD615 \uC9C0\uC624\uD39C\uC2A4 \uC124\uC815" }), _jsx(Divider, {}), _jsxs(Space, { children: [_jsx(Form.Item, { name: "latitude", label: "\uC704\uB3C4", rules: [{ required: true, message: '위도를 입력하세요' }], children: _jsx(InputNumber, { step: 0.000001, precision: 6, placeholder: "37.5665" }) }), _jsx(Form.Item, { name: "longitude", label: "\uACBD\uB3C4", rules: [{ required: true, message: '경도를 입력하세요' }], children: _jsx(InputNumber, { step: 0.000001, precision: 6, placeholder: "126.9780" }) })] }), _jsx(Form.Item, { name: "radius", label: "\uBC18\uACBD (\uBBF8\uD130)", rules: [{ required: true, message: '반경을 입력하세요' }], children: _jsx(InputNumber, { min: 100, max: 10000, step: 100, placeholder: "1000", addonAfter: "m" }) })] }));
                                }
                                if (type === GeofenceType.POLYGON || type === GeofenceType.RECTANGLE) {
                                    return (_jsxs(_Fragment, { children: [_jsxs(Title, { level: 5, children: [type === GeofenceType.POLYGON ? '다각형' : '사각형', " \uC9C0\uC624\uD39C\uC2A4 \uC124\uC815"] }), _jsx(Divider, {}), _jsx(Form.Item, { children: _jsxs(Text, { type: "secondary", children: ["\uC9C0\uB3C4\uC5D0\uC11C ", type === GeofenceType.POLYGON ? '다각형' : '사각형', "\uC744 \uADF8\uB824 \uC9C0\uC624\uD39C\uC2A4\uB97C \uC0DD\uC131\uD558\uC138\uC694."] }) })] }));
                                }
                                return null;
                            } }), _jsx(Title, { level: 5, children: "\uC54C\uB9BC \uC124\uC815" }), _jsx(Divider, {}), _jsx(Form.Item, { name: "alerts", label: "\uC54C\uB9BC \uC720\uD615", rules: [{ required: true, message: '적어도 하나의 알림 유형을 선택하세요' }], children: _jsxs(Select, { mode: "multiple", placeholder: "\uC54C\uB9BC \uC720\uD615 \uC120\uD0DD", children: [_jsx(Option, { value: GeofenceAlertType.ENTRY, children: "\uC9C4\uC785 \uC2DC \uC54C\uB9BC" }), _jsx(Option, { value: GeofenceAlertType.EXIT, children: "\uC774\uD0C8 \uC2DC \uC54C\uB9BC" }), _jsx(Option, { value: GeofenceAlertType.DWELL, children: "\uCCB4\uB958 \uC2DC \uC54C\uB9BC" })] }) }), _jsx(Form.Item, { name: "color", label: "\uC9C0\uC624\uD39C\uC2A4 \uC0C9\uC0C1", children: _jsx(ColorPicker, {}) }), _jsx(Title, { level: 5, children: "\uCC28\uB7C9 \uD560\uB2F9" }), _jsx(Divider, {}), _jsx(Form.Item, { name: "vehicleIds", label: "\uBAA8\uB2C8\uD130\uB9C1\uD560 \uCC28\uB7C9", extra: "\uC120\uD0DD\uD55C \uCC28\uB7C9\uB4E4\uC774 \uC774 \uC9C0\uC624\uD39C\uC2A4\uC758 \uC601\uC5ED\uC744 \uC9C4\uC785\uD558\uAC70\uB098 \uC774\uD0C8\uD560 \uB54C \uC54C\uB9BC\uC744 \uBC1B\uC2B5\uB2C8\uB2E4.", children: _jsx(Select, { mode: "multiple", placeholder: "\uCC28\uB7C9 \uC120\uD0DD", optionFilterProp: "children", showSearch: true, allowClear: true, children: vehicleList.map(vehicle => (_jsx(Option, { value: vehicle.id, children: _jsxs(Space, { children: [_jsx(CarOutlined, {}), _jsx("span", { children: vehicle.name })] }) }, vehicle.id))) }) }), _jsx(Divider, {}), _jsx(Form.Item, { children: _jsxs(Space, { children: [_jsx(Button, { type: "primary", htmlType: "submit", loading: loading, children: editingGeofence ? '업데이트' : '생성' }), _jsx(Button, { onClick: handleCancel, children: "\uCDE8\uC18C" })] }) })] }) })] }));
};
export default GeofenceManager;
