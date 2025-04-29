/**
 * 분석 데이터 관련 타입 정의
 */
/**
 * 분석 시간 프레임 열거형
 */
export var AnalyticsTimeFrame;
(function (AnalyticsTimeFrame) {
    AnalyticsTimeFrame["DAY"] = "day";
    AnalyticsTimeFrame["WEEK"] = "week";
    AnalyticsTimeFrame["MONTH"] = "month";
    AnalyticsTimeFrame["QUARTER"] = "quarter";
    AnalyticsTimeFrame["YEAR"] = "year";
    AnalyticsTimeFrame["CUSTOM"] = "custom";
})(AnalyticsTimeFrame || (AnalyticsTimeFrame = {}));
