/**
 * Todo 템플릿 서비스 클래스
 */
class TodoTemplateService {
    constructor() {
        this.templates = [];
        this.templateCounter = 0;
        this.listeners = [];
        // 로컬 스토리지에서 템플릿 복원
        this.loadTemplatesFromStorage();
        // 샘플 템플릿이 없으면 기본 템플릿 생성
        if (this.templates.length === 0) {
            this.createDefaultTemplates();
        }
    }
    /**
     * 로컬 스토리지에서 템플릿 불러오기
     */
    loadTemplatesFromStorage() {
        try {
            const storedTemplates = localStorage.getItem('todoTemplates');
            if (storedTemplates) {
                const parsed = JSON.parse(storedTemplates);
                this.templates = parsed.map((t) => ({
                    ...t,
                    createdAt: new Date(t.createdAt),
                    updatedAt: new Date(t.updatedAt)
                }));
                // 로직 오류 수정: 유효한 ID 번호만 추출하고 NaN 처리
                const validIds = this.templates
                    .map(t => {
                    const parts = t.id.split('-');
                    return parts.length > 1 ? parseInt(parts[1], 10) : NaN;
                })
                    .filter(id => !isNaN(id));
                this.templateCounter = validIds.length > 0 ? Math.max(...validIds) + 1 : 0;
            }
        }
        catch (error) {
            console.error('템플릿을 로컬 스토리지에서 불러오는 중 오류가 발생했습니다:', error);
        }
    }
    /**
     * 템플릿을 로컬 스토리지에 저장
     */
    saveTemplatesToStorage() {
        try {
            // 직렬화 과정에서 오류 발생 가능성 차단
            const templatesJSON = JSON.stringify(this.templates);
            // 스토리지 용량 검사 (대략적인 추정)
            if (templatesJSON.length > 4.5 * 1024 * 1024) {
                // ~4.5MB (localStorage 5MB 제한에 근접)
                console.warn('템플릿 데이터가 로컬 스토리지 용량 한도에 근접했습니다. 일부 템플릿을 정리하는 것이 좋습니다.');
            }
            localStorage.setItem('todoTemplates', templatesJSON);
        }
        catch (error) {
            console.error('템플릿을 로컬 스토리지에 저장하는 중 오류가 발생했습니다:', error);
            // QuotaExceededError 특별 처리
            if (error instanceof DOMException &&
                (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                console.error('로컬 스토리지 용량이 초과되었습니다. 오래된 템플릿을 정리해주세요.');
                // 중요 알림 표시나 사용자에게 알릴 수 있는 메커니즘 추가 가능
            }
        }
    }
    /**
     * 기본 템플릿 생성
     */
    createDefaultTemplates() {
        const now = new Date();
        const defaultTemplates = [
            {
                id: `template-${this.templateCounter++}`,
                name: '정기 오일 교체',
                description: '5,000km 주행 후 엔진 오일 교체',
                category: '정기 정비',
                template: {
                    title: '엔진 오일 교체',
                    description: '5,000km 주행 후 엔진 오일 및 필터 교체',
                    priority: 'medium',
                    completed: false
                },
                createdAt: now,
                updatedAt: now
            },
            {
                id: `template-${this.templateCounter++}`,
                name: '타이어 교체',
                description: '타이어 마모도 검사 및 교체',
                category: '정기 정비',
                template: {
                    title: '타이어 교체',
                    description: '마모도 검사 후 필요시 타이어 교체(마모도 70% 이상 시)',
                    priority: 'medium',
                    completed: false
                },
                createdAt: now,
                updatedAt: now
            },
            {
                id: `template-${this.templateCounter++}`,
                name: '브레이크 패드 점검',
                description: '브레이크 패드 마모도 점검 및 교체',
                category: '안전 점검',
                template: {
                    title: '브레이크 패드 점검',
                    description: '브레이크 패드 마모도 검사 및 필요시 교체',
                    priority: 'high',
                    completed: false
                },
                createdAt: now,
                updatedAt: now
            },
            {
                id: `template-${this.templateCounter++}`,
                name: '냉각수 교체',
                description: '2년 또는 40,000km 주행 후 냉각수 교체',
                category: '정기 정비',
                template: {
                    title: '냉각수 교체',
                    description: '냉각수 레벨 점검 및 교체',
                    priority: 'medium',
                    completed: false
                },
                createdAt: now,
                updatedAt: now
            },
            {
                id: `template-${this.templateCounter++}`,
                name: '에어컨 필터 교체',
                description: '에어컨 필터 상태 점검 및 교체',
                category: '실내 관리',
                template: {
                    title: '에어컨 필터 교체',
                    description: '에어컨/히터 필터 상태 점검 및 교체',
                    priority: 'low',
                    completed: false
                },
                createdAt: now,
                updatedAt: now
            }
        ];
        this.templates = defaultTemplates;
        this.saveTemplatesToStorage();
    }
    /**
     * 템플릿 리스너 등록
     */
    subscribeToTemplates(listener) {
        this.listeners.push(listener);
        // 현재 템플릿 목록으로 초기 콜백
        listener([...this.templates]);
        // 구독 해제 함수 반환
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    /**
     * 리스너들에게 템플릿 변경 사항 알림
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            listener([...this.templates]);
        });
    }
    /**
     * 모든 템플릿 반환
     */
    getAllTemplates() {
        return [...this.templates].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    /**
     * 카테고리 별 템플릿 반환
     */
    getTemplatesByCategory(category) {
        return this.templates
            .filter(template => template.category === category)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    /**
     * 모든 카테고리 목록 반환
     */
    getAllCategories() {
        const categories = new Set(this.templates.map(template => template.category));
        return Array.from(categories).sort();
    }
    /**
     * 새 템플릿 생성
     */
    createTemplate(name, template, category, description) {
        const now = new Date();
        const newTemplate = {
            id: `template-${this.templateCounter++}`,
            name,
            description,
            template,
            category,
            createdAt: now,
            updatedAt: now
        };
        this.templates.push(newTemplate);
        this.saveTemplatesToStorage();
        this.notifyListeners();
        return newTemplate;
    }
    /**
     * 특정 ID의 템플릿 반환
     */
    getTemplateById(id) {
        // ID 유효성 검사
        if (!id || typeof id !== 'string') {
            console.error('유효하지 않은 템플릿 ID:', id);
            return null;
        }
        // ID 형식 검증 (template-숫자 형식)
        if (!id.startsWith('template-')) {
            console.warn('올바르지 않은 템플릿 ID 형식:', id);
            // 잘못된 형식이지만 시도는 해봄
        }
        const template = this.templates.find(template => template.id === id);
        return template || null;
    }
    /**
     * 템플릿 업데이트
     */
    updateTemplate(id, updates) {
        const templateIndex = this.templates.findIndex(template => template.id === id);
        if (templateIndex === -1) {
            return undefined;
        }
        const updatedTemplate = {
            ...this.templates[templateIndex],
            ...updates,
            updatedAt: new Date()
        };
        this.templates[templateIndex] = updatedTemplate;
        this.saveTemplatesToStorage();
        this.notifyListeners();
        return updatedTemplate;
    }
    /**
     * 템플릿 삭제
     */
    deleteTemplate(id) {
        const initialLength = this.templates.length;
        this.templates = this.templates.filter(template => template.id !== id);
        if (this.templates.length !== initialLength) {
            this.saveTemplatesToStorage();
            this.notifyListeners();
            return true;
        }
        return false;
    }
    /**
     * 템플릿을 Todo 항목으로 변환
     */
    applyTemplate(templateId, vehicleId, dueDate) {
        const template = this.getTemplateById(templateId);
        if (!template) {
            return undefined;
        }
        // 깊은 복사로 원본 템플릿 객체와 분리하여 참조 문제 방지
        const newTodo = {
            // 템플릿의 기본 속성 복사
            title: template.template.title,
            description: template.template.description,
            priority: template.template.priority,
            completed: false, // 항상 완료되지 않은 상태로 생성
            // 추가 파라미터
            vehicleId: vehicleId || undefined,
            dueDate: dueDate || undefined
        };
        return newTodo;
    }
    /**
     * 템플릿을 가져오는 서비스 함수
     * @param templateId 템플릿 ID
     * @returns 찾은 템플릿 또는 null
     */
    serviceFetchTemplate(templateId) {
        try {
            const template = this.getTemplateById(templateId);
            return template || null;
        }
        catch (error) {
            console.error(`Template fetch failed for ID ${templateId}:`, error);
            return null;
        }
    }
}
// 싱글톤 인스턴스 생성
export const todoTemplateService = new TodoTemplateService();
export default todoTemplateService;
