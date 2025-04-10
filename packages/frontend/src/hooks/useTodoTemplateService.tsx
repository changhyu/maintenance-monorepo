import { useState, useCallback } from 'react';
import { TodoTemplate, todoTemplateService } from '../services/todoTemplateService';
import { TodoCreateRequest } from './useTodoService';

interface TodoTemplateState {
  templates: TodoTemplate[];
  loading: boolean;
  error: string | null;
}

/**
 * Todo 템플릿 서비스를 관리하는 커스텀 훅
 */
export const useTodoTemplateService = () => {
  const [state, setState] = useState<TodoTemplateState>({
    templates: [],
    loading: false,
    error: null
  });

  // TodoTemplateService 인스턴스 생성
  const templateService = todoTemplateService;

  /**
   * 모든 템플릿 조회
   */
  const fetchTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const templates = templateService.getAllTemplates();
      setState(prev => ({ ...prev, templates, loading: false }));
      return templates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿 목록을 불러오는 중 오류가 발생했습니다.';
      console.error('Error fetching templates:', err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return [];
    }
  }, []);

  /**
   * 특정 ID의 템플릿 조회
   */
  const fetchTemplateById = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const template = templateService.getTemplateById(id);
      setState(prev => ({ ...prev, loading: false }));
      return template || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿을 불러오는 중 오류가 발생했습니다.';
      console.error(`Error fetching template ${id}:`, err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return null;
    }
  }, []);

  /**
   * 새 템플릿 생성
   */
  const createTemplate = useCallback(async (templateData: {
    name: string;
    template: Omit<TodoCreateRequest, 'vehicleId'>;
    category: string;
    description?: string;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { name, template, category, description } = templateData;
      const newTemplate = templateService.createTemplate(
        name,
        template,
        category,
        description
      );
      
      if (newTemplate) {
        setState(prev => ({
          ...prev,
          templates: [...prev.templates, newTemplate],
          loading: false
        }));
        return newTemplate;
      } else {
        throw new Error('템플릿 생성에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿을 생성하는 중 오류가 발생했습니다.';
      console.error('Error creating template:', err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return null;
    }
  }, []);

  /**
   * 템플릿 업데이트
   */
  const updateTemplate = useCallback(async (id: string, updates: Partial<Omit<TodoTemplate, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const updatedTemplate = templateService.updateTemplate(id, updates);
      if (updatedTemplate) {
        setState(prev => ({
          ...prev,
          templates: prev.templates.map(t => t.id === id ? updatedTemplate : t),
          loading: false
        }));
        return updatedTemplate;
      } else {
        throw new Error(`ID가 ${id}인 템플릿을 찾을 수 없습니다.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿을 업데이트하는 중 오류가 발생했습니다.';
      console.error(`Error updating template ${id}:`, err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return null;
    }
  }, []);

  /**
   * 템플릿 삭제
   */
  const deleteTemplate = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const success = templateService.deleteTemplate(id);
      if (success) {
        setState(prev => ({
          ...prev,
          templates: prev.templates.filter(t => t.id !== id),
          loading: false
        }));
        return true;
      } else {
        throw new Error('템플릿 삭제에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿을 삭제하는 중 오류가 발생했습니다.';
      console.error(`Error deleting template ${id}:`, err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return false;
    }
  }, []);

  /**
   * 템플릿을 Todo 항목으로 변환
   */
  const applyTemplate = useCallback((
    templateId: string,
    vehicleId?: string,
    dueDate?: string
  ): TodoCreateRequest | null => {
    try {
      const result = templateService.applyTemplate(templateId, vehicleId, dueDate);
      return result || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '템플릿 적용 중 오류가 발생했습니다.';
      console.error(`Error applying template ${templateId}:`, err);
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, []);

  /**
   * 특정 카테고리의 템플릿 조회
   */
  const fetchTemplatesByCategory = useCallback((category: string) => {
    try {
      const templates = templateService.getTemplatesByCategory(category);
      return templates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카테고리별 템플릿을 불러오는 중 오류가 발생했습니다.';
      console.error(`Error fetching templates by category ${category}:`, err);
      setState(prev => ({ ...prev, error: errorMessage }));
      return [];
    }
  }, []);

  return {
    templates: state.templates,
    loading: state.loading,
    error: state.error,
    fetchTemplates,
    fetchTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    fetchTemplatesByCategory
  };
}; 