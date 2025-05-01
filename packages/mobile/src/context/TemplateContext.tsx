import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReportTemplate, TemplateSettings } from '../types/report';
import { useAuth } from './AuthContext';

interface TemplateContextType {
  templates: ReportTemplate[];
  settings: TemplateSettings;
  loading: boolean;
  error: string | null;
  addTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<ReportTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => ReportTemplate | undefined;
  setDefaultTemplate: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<TemplateSettings>) => Promise<void>;
  importTemplate: (template: ReportTemplate) => Promise<void>;
  exportTemplate: (id: string) => Promise<string>;
}

const defaultSettings: TemplateSettings = {
  defaultFormat: 'pdf',
  defaultGroupBy: 'none',
  defaultFields: {
    status: true,
    serviceType: true,
    priority: true,
    duration: true,
    cost: true,
    location: true,
    notes: false,
    parts: false,
  },
  autoSave: true,
};

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadSettings();
  }, []);

  const loadTemplates = async () => {
    try {
      const storedTemplates = await AsyncStorage.getItem('report_templates');
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
    } catch (err) {
      setError('템플릿 로드 중 오류가 발생했습니다.');
      console.error('템플릿 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('template_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (err) {
      setError('설정 로드 중 오류가 발생했습니다.');
      console.error('설정 로드 오류:', err);
    }
  };

  const saveTemplates = async (newTemplates: ReportTemplate[]) => {
    try {
      await AsyncStorage.setItem('report_templates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (err) {
      setError('템플릿 저장 중 오류가 발생했습니다.');
      console.error('템플릿 저장 오류:', err);
    }
  };

  const saveSettings = async (newSettings: TemplateSettings) => {
    try {
      await AsyncStorage.setItem('template_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (err) {
      setError('설정 저장 중 오류가 발생했습니다.');
      console.error('설정 저장 오류:', err);
    }
  };

  const addTemplate = async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate: ReportTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newTemplates = [...templates, newTemplate];
      await saveTemplates(newTemplates);
    } catch (err) {
      setError('템플릿 추가 중 오류가 발생했습니다.');
      console.error('템플릿 추가 오류:', err);
    }
  };

  const updateTemplate = async (id: string, template: Partial<ReportTemplate>) => {
    try {
      const newTemplates = templates.map(t =>
        t.id === id
          ? { ...t, ...template, updatedAt: new Date() }
          : t
      );
      await saveTemplates(newTemplates);
    } catch (err) {
      setError('템플릿 업데이트 중 오류가 발생했습니다.');
      console.error('템플릿 업데이트 오류:', err);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const newTemplates = templates.filter(t => t.id !== id);
      await saveTemplates(newTemplates);
    } catch (err) {
      setError('템플릿 삭제 중 오류가 발생했습니다.');
      console.error('템플릿 삭제 오류:', err);
    }
  };

  const getTemplate = (id: string) => {
    return templates.find(t => t.id === id);
  };

  const setDefaultTemplate = async (id: string) => {
    try {
      const newTemplates = templates.map(t => ({
        ...t,
        isDefault: t.id === id,
      }));
      await saveTemplates(newTemplates);
    } catch (err) {
      setError('기본 템플릿 설정 중 오류가 발생했습니다.');
      console.error('기본 템플릿 설정 오류:', err);
    }
  };

  const updateSettings = async (newSettings: Partial<TemplateSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await saveSettings(updatedSettings);
    } catch (err) {
      setError('설정 업데이트 중 오류가 발생했습니다.');
      console.error('설정 업데이트 오류:', err);
    }
  };

  const importTemplate = async (template: ReportTemplate) => {
    try {
      const newTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newTemplates = [...templates, newTemplate];
      await saveTemplates(newTemplates);
    } catch (err) {
      setError('템플릿 가져오기 중 오류가 발생했습니다.');
      console.error('템플릿 가져오기 오류:', err);
    }
  };

  const exportTemplate = async (id: string) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) {
        throw new Error('템플릿을 찾을 수 없습니다.');
      }
      return JSON.stringify(template);
    } catch (err) {
      setError('템플릿 내보내기 중 오류가 발생했습니다.');
      console.error('템플릿 내보내기 오류:', err);
      throw err;
    }
  };

  return (
    <TemplateContext.Provider
      value={{
        templates,
        settings,
        loading,
        error,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        getTemplate,
        setDefaultTemplate,
        updateSettings,
        importTemplate,
        exportTemplate,
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
}; 