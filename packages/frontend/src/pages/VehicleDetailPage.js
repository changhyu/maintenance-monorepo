import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tabs } from 'antd';
import { useParams } from 'react-router-dom';
import MileageAlertSettings from '../components/vehicle/MileageAlertSettings';
import { useApi } from '../context/ApiContext';
import { MileageUnit } from '../services/mileageAlertService';
const VehicleDetailPage = () => {
    const { vehicleId = 'vehicle-123' } = useParams();
    const vehicleData = { mileage: 12345, mileageUnit: MileageUnit.KILOMETERS };
    const { apiClient } = useApi();
    return (_jsxs("div", { className: "vehicle-detail-page", children: [_jsx("h1", { children: "\uCC28\uB7C9 \uC0C1\uC138 \uC815\uBCF4" }), _jsxs(Tabs, { defaultActiveKey: "overview", children: [_jsxs(Tabs.TabPane, { tab: "\uAC1C\uC694", children: [_jsxs("p", { children: ["\uCC28\uB7C9 ID: ", vehicleId] }), _jsxs("p", { children: ["\uC8FC\uD589 \uAC70\uB9AC: ", vehicleData.mileage, " ", vehicleData.mileageUnit] })] }, "overview"), _jsx(Tabs.TabPane, { tab: "\uC8FC\uD589\uAC70\uB9AC \uC54C\uB9BC", children: _jsx(MileageAlertSettings, { apiClient: apiClient, vehicleId: vehicleId, currentMileage: vehicleData?.mileage, mileageUnit: vehicleData?.mileageUnit || MileageUnit.KILOMETERS }) }, "mileage-alerts")] })] }));
};
export default VehicleDetailPage;
