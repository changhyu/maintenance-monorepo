import { useRef, useEffect } from 'react';
/**
 * 이전 값을 추적하는 커스텀 훅
 *
 * @template T 값의 타입
 * @param {T} value 추적할 현재 값
 * @returns {T | undefined} 이전 렌더링의 값
 *
 * @example
 * const count = useState(0);
 * const prevCount = usePrevious(count);
 * console.log(count, prevCount); // 현재 카운트와 이전 카운트 출력
 */
export function usePrevious(value) {
    // 이전 값을 저장할 ref
    const ref = useRef();
    // 렌더링 후 ref를 현재 값으로 업데이트
    useEffect(() => {
        ref.current = value;
    }, [value]);
    // ref.current는 이전 렌더링의 값을 담고 있음
    return ref.current;
}
export default usePrevious;
