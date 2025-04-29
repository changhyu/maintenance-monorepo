import { jsx as _jsx } from "react/jsx-runtime";
// 예약 상태 정의
export var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "\uB300\uAE30 \uC911";
    BookingStatus["CONFIRMED"] = "\uD655\uC815";
    BookingStatus["COMPLETED"] = "\uC644\uB8CC";
    BookingStatus["CANCELLED"] = "\uCDE8\uC18C";
})(BookingStatus || (BookingStatus = {}));
const BookingHistoryPage = ({ booking }) => {
    // 옵셔널 체이닝 사용
    const status = booking?.status;
    const vehicleInfo = booking?.vehicleName;
    return (_jsx("div", {}));
};
export default BookingHistoryPage;
