import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 날짜 포맷 함수
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
};
// 상대적 시간 표시 함수
const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) {
        return '방금 전';
    }
    else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}분 전`;
    }
    else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    }
    else if (diffInSeconds < 604800) {
        return `${Math.floor(diffInSeconds / 86400)}일 전`;
    }
    else {
        return formatDate(dateString);
    }
};
// 상태에 따른 표시 함수
const getStatusDisplay = (status) => {
    switch (status.toLowerCase()) {
        case 'scheduled':
            return { text: '예약됨', color: 'bg-blue-100 text-blue-800' };
        case 'in_progress':
            return { text: '진행 중', color: 'bg-yellow-100 text-yellow-800' };
        case 'completed':
            return { text: '완료됨', color: 'bg-green-100 text-green-800' };
        case 'cancelled':
            return { text: '취소됨', color: 'bg-red-100 text-red-800' };
        default:
            return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
};
export const MaintenanceCard = ({ maintenance, onClick, className = '', showDetails = false }) => {
    // 정비 타입에 따른 배지 색상 결정
    const getBadgeColor = (type) => {
        switch (type.toLowerCase()) {
            case 'routine':
                return 'bg-blue-100 text-blue-800';
            case 'repair':
                return 'bg-yellow-100 text-yellow-800';
            case 'emergency':
                return 'bg-red-100 text-red-800';
            case 'recall':
                return 'bg-purple-100 text-purple-800';
            case 'inspection':
                return 'bg-green-100 text-green-800';
            case 'oil_change':
                return 'bg-indigo-100 text-indigo-800';
            case 'seasonal':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    // 총 비용 계산 (부품이 있는 경우)
    const totalCost = maintenance.cost +
        (maintenance.parts?.reduce((sum, part) => sum + (part.totalCost || 0), 0) || 0);
    // 상태 정보
    const statusInfo = getStatusDisplay(maintenance.status);
    return (_jsxs("div", { className: `bg-white shadow rounded-lg p-4 mb-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`, onClick: onClick, children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex gap-2 mb-1", children: [_jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(maintenance.type)}`, children: maintenance.type }), _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`, children: statusInfo.text })] }), _jsx("h3", { className: "text-lg font-medium mt-1", children: maintenance.description })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-sm text-gray-500", children: maintenance.updatedAt ? getRelativeTime(maintenance.updatedAt) : getRelativeTime(maintenance.date) }), _jsxs("p", { className: "font-medium text-lg", children: [totalCost.toLocaleString(), "\uC6D0"] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 mb-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "\uC815\uBE44 \uC608\uC815\uC77C" }), _jsx("p", { className: "font-medium", children: formatDate(maintenance.date) })] }), maintenance.completionDate && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "\uC644\uB8CC\uC77C" }), _jsx("p", { className: "font-medium", children: formatDate(maintenance.completionDate) })] })), maintenance.mileage && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "\uC8FC\uD589\uAC70\uB9AC" }), _jsxs("p", { className: "font-medium", children: [maintenance.mileage.toLocaleString(), " km"] })] }))] }), (maintenance.provider || maintenance.performedBy) && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm text-gray-500", children: maintenance.provider ? '정비소' : '담당자' }), _jsx("p", { className: "font-medium", children: maintenance.provider || maintenance.performedBy })] })), showDetails && maintenance.parts && maintenance.parts.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "\uAD50\uCCB4 \uBD80\uD488" }), _jsx("div", { className: "space-y-1", children: maintenance.parts.map(part => (_jsxs("div", { className: "flex justify-between items-center text-sm", children: [_jsxs("span", { children: [part.name, " ", part.quantity > 1 ? `(${part.quantity}개)` : ''] }), _jsxs("span", { className: "font-medium", children: [part.totalCost.toLocaleString(), "\uC6D0"] })] }, part.id))) })] })), !showDetails && maintenance.parts && maintenance.parts.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "text-sm text-gray-500", children: "\uAD50\uCCB4 \uBD80\uD488" }), _jsx("p", { className: "font-medium", children: maintenance.parts.map(part => part.name).join(', ') })] })), maintenance.notes && (_jsx("div", { className: "mt-2 pt-2 border-t border-gray-100", children: _jsx("p", { className: "text-sm text-gray-600", children: maintenance.notes }) })), maintenance.documents && maintenance.documents.length > 0 && (_jsxs("div", { className: "mt-2 flex items-center", children: [_jsx("svg", { className: "h-4 w-4 text-gray-400 mr-1", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" }) }), _jsxs("p", { className: "text-sm text-gray-500", children: [maintenance.documents.length, "\uAC1C \uBB38\uC11C \uCCA8\uBD80\uB428"] })] })), showDetails && maintenance.documents && maintenance.documents.length > 0 && (_jsx("div", { className: "mt-2 space-y-1", children: maintenance.documents.map(doc => (_jsxs("a", { href: doc.fileUrl, target: "_blank", rel: "noopener noreferrer", className: "flex items-center text-sm text-blue-600 hover:underline", children: [_jsx("svg", { className: "h-4 w-4 mr-1", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" }) }), doc.fileName] }, doc.id))) }))] }));
};
export default MaintenanceCard;
