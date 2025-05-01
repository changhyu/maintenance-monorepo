import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Platform } from 'react-native';
import {
  ShareSettings,
  ShareLink,
  SharePermission,
  ShareActivity,
  ShareRecipient,
} from '../types/report';
import { useAuth } from './AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Device from 'expo-device';
import * as Location from 'expo-location';

interface ShareContextType {
  links: ShareLink[];
  permissions: SharePermission[];
  activities: ShareActivity[];
  recipients: ShareRecipient[];
  loading: boolean;
  error: string | null;
  createShareLink: (reportId: string, settings: ShareSettings) => Promise<ShareLink>;
  updateShareLink: (id: string, settings: Partial<ShareSettings>) => Promise<void>;
  deleteShareLink: (id: string) => Promise<void>;
  grantPermission: (reportId: string, userId: string, permissions: SharePermission['permissions']) => Promise<void>;
  revokePermission: (id: string) => Promise<void>;
  shareViaEmail: (reportId: string, recipients: { email: string; name?: string }[], message?: string) => Promise<void>;
  trackActivity: (reportId: string, action: ShareActivity['action']) => Promise<void>;
  getReportActivities: (reportId: string) => ShareActivity[];
  getReportPermissions: (reportId: string) => SharePermission[];
  getReportRecipients: (reportId: string) => ShareRecipient[];
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export const ShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [permissions, setPermissions] = useState<SharePermission[]>([]);
  const [activities, setActivities] = useState<ShareActivity[]>([]);
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedLinks, storedPermissions, storedActivities, storedRecipients] = await Promise.all([
        AsyncStorage.getItem('share_links'),
        AsyncStorage.getItem('share_permissions'),
        AsyncStorage.getItem('share_activities'),
        AsyncStorage.getItem('share_recipients'),
      ]);

      setLinks(storedLinks ? JSON.parse(storedLinks) : []);
      setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
      setActivities(storedActivities ? JSON.parse(storedActivities) : []);
      setRecipients(storedRecipients ? JSON.parse(storedRecipients) : []);
    } catch (err) {
      setError('공유 데이터 로드 중 오류가 발생했습니다.');
      console.error('공유 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveLinks = async (newLinks: ShareLink[]) => {
    try {
      await AsyncStorage.setItem('share_links', JSON.stringify(newLinks));
      setLinks(newLinks);
    } catch (err) {
      setError('공유 링크 저장 중 오류가 발생했습니다.');
      console.error('공유 링크 저장 오류:', err);
    }
  };

  const savePermissions = async (newPermissions: SharePermission[]) => {
    try {
      await AsyncStorage.setItem('share_permissions', JSON.stringify(newPermissions));
      setPermissions(newPermissions);
    } catch (err) {
      setError('권한 저장 중 오류가 발생했습니다.');
      console.error('권한 저장 오류:', err);
    }
  };

  const saveActivities = async (newActivities: ShareActivity[]) => {
    try {
      await AsyncStorage.setItem('share_activities', JSON.stringify(newActivities));
      setActivities(newActivities);
    } catch (err) {
      console.error('활동 저장 오류:', err);
    }
  };

  const saveRecipients = async (newRecipients: ShareRecipient[]) => {
    try {
      await AsyncStorage.setItem('share_recipients', JSON.stringify(newRecipients));
      setRecipients(newRecipients);
    } catch (err) {
      console.error('수신자 저장 오류:', err);
    }
  };

  const createShareLink = async (reportId: string, settings: ShareSettings): Promise<ShareLink> => {
    try {
      const link: ShareLink = {
        id: Date.now().toString(),
        reportId,
        url: `https://your-domain.com/reports/${reportId}/share/${Date.now()}`,
        settings,
        createdAt: new Date(),
        createdBy: user?.id || 'anonymous',
        accessCount: 0,
      };

      const newLinks = [...links, link];
      await saveLinks(newLinks);
      await trackActivity(reportId, 'share');

      return link;
    } catch (err) {
      setError('공유 링크 생성 중 오류가 발생했습니다.');
      console.error('공유 링크 생성 오류:', err);
      throw err;
    }
  };

  const updateShareLink = async (id: string, settings: Partial<ShareSettings>) => {
    try {
      const newLinks = links.map(link =>
        link.id === id
          ? { ...link, settings: { ...link.settings, ...settings } }
          : link
      );
      await saveLinks(newLinks);
    } catch (err) {
      setError('공유 링크 업데이트 중 오류가 발생했습니다.');
      console.error('공유 링크 업데이트 오류:', err);
    }
  };

  const deleteShareLink = async (id: string) => {
    try {
      const newLinks = links.filter(link => link.id !== id);
      await saveLinks(newLinks);
    } catch (err) {
      setError('공유 링크 삭제 중 오류가 발생했습니다.');
      console.error('공유 링크 삭제 오류:', err);
    }
  };

  const grantPermission = async (
    reportId: string,
    userId: string,
    permissions: SharePermission['permissions']
  ) => {
    try {
      const permission: SharePermission = {
        id: Date.now().toString(),
        reportId,
        userId,
        permissions,
        createdAt: new Date(),
        createdBy: user?.id || 'anonymous',
      };

      const newPermissions = [...permissions, permission];
      await savePermissions(newPermissions);
      await trackActivity(reportId, 'share');
    } catch (err) {
      setError('권한 부여 중 오류가 발생했습니다.');
      console.error('권한 부여 오류:', err);
    }
  };

  const revokePermission = async (id: string) => {
    try {
      const newPermissions = permissions.filter(permission => permission.id !== id);
      await savePermissions(newPermissions);
    } catch (err) {
      setError('권한 취소 중 오류가 발생했습니다.');
      console.error('권한 취소 오류:', err);
    }
  };

  const shareViaEmail = async (
    reportId: string,
    recipients: { email: string; name?: string }[],
    message?: string
  ) => {
    try {
      const newRecipients: ShareRecipient[] = recipients.map(recipient => ({
        id: Date.now().toString(),
        reportId,
        email: recipient.email,
        name: recipient.name,
        message,
        sentAt: new Date(),
        status: 'pending',
        notificationPreference: 'onAccess',
      }));

      await saveRecipients([...recipients, ...newRecipients]);
      await trackActivity(reportId, 'share');

      // 여기에 실제 이메일 전송 로직 구현
      // 예: AWS SES, SendGrid 등 사용

    } catch (err) {
      setError('이메일 공유 중 오류가 발생했습니다.');
      console.error('이메일 공유 오류:', err);
    }
  };

  const trackActivity = async (reportId: string, action: ShareActivity['action']) => {
    try {
      let location;
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          location = await Location.getCurrentPositionAsync({});
        }
      }

      const activity: ShareActivity = {
        id: Date.now().toString(),
        reportId,
        userId: user?.id,
        action,
        timestamp: new Date(),
        deviceInfo: Device.modelName,
        location: location ? `${location.coords.latitude},${location.coords.longitude}` : undefined,
      };

      const newActivities = [...activities, activity];
      await saveActivities(newActivities);
    } catch (err) {
      console.error('활동 추적 오류:', err);
    }
  };

  const getReportActivities = (reportId: string) => {
    return activities.filter(activity => activity.reportId === reportId);
  };

  const getReportPermissions = (reportId: string) => {
    return permissions.filter(permission => permission.reportId === reportId);
  };

  const getReportRecipients = (reportId: string) => {
    return recipients.filter(recipient => recipient.reportId === reportId);
  };

  return (
    <ShareContext.Provider
      value={{
        links,
        permissions,
        activities,
        recipients,
        loading,
        error,
        createShareLink,
        updateShareLink,
        deleteShareLink,
        grantPermission,
        revokePermission,
        shareViaEmail,
        trackActivity,
        getReportActivities,
        getReportPermissions,
        getReportRecipients,
      }}
    >
      {children}
    </ShareContext.Provider>
  );
};

export const useShare = () => {
  const context = useContext(ShareContext);
  if (context === undefined) {
    throw new Error('useShare must be used within a ShareProvider');
  }
  return context;
}; 