import React, { createContext, useContext, useState, useEffect } from 'react';
import { MaintenanceTask } from '../types/maintenance';
import { useOfflineManager } from './OfflineContext';
import { api } from '../services/api';

interface TodoContextType {
  tasks: MaintenanceTask[];
  loading: boolean;
  error: string | null;
  addTask: (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, task: Partial<MaintenanceTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  syncTasks: () => Promise<MaintenanceTask[]>;
  refreshTasks: () => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOffline, queueOperation } = useOfflineManager();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/maintenance/tasks');
      setTasks(response.data);
    } catch (err) {
      setError('작업 목록을 불러오는데 실패했습니다.');
      console.error('작업 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (isOffline) {
        const operationId = queueOperation('maintenance', 'create', '', task);
        const newTask: MaintenanceTask = {
          ...task,
          id: operationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTasks(prev => [...prev, newTask]);
        return;
      }

      const response = await api.post('/maintenance/tasks', task);
      setTasks(prev => [...prev, response.data]);
    } catch (err) {
      console.error('작업 추가 실패:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<MaintenanceTask>) => {
    try {
      if (isOffline) {
        queueOperation('maintenance', 'update', id, updates);
        setTasks(prev => prev.map(task => 
          task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
        ));
        return;
      }

      const response = await api.patch(`/maintenance/tasks/${id}`, updates);
      setTasks(prev => prev.map(task => 
        task.id === id ? response.data : task
      ));
    } catch (err) {
      console.error('작업 업데이트 실패:', err);
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      if (isOffline) {
        queueOperation('maintenance', 'delete', id, {});
        setTasks(prev => prev.filter(task => task.id !== id));
        return;
      }

      await api.delete(`/maintenance/tasks/${id}`);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('작업 삭제 실패:', err);
      throw err;
    }
  };

  const syncTasks = async () => {
    try {
      const response = await api.get('/maintenance/tasks');
      setTasks(response.data);
      return response.data;
    } catch (err) {
      console.error('작업 동기화 실패:', err);
      throw err;
    }
  };

  const refreshTasks = async () => {
    await fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <TodoContext.Provider
      value={{
        tasks,
        loading,
        error,
        addTask,
        updateTask,
        deleteTask,
        syncTasks,
        refreshTasks,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
}; 