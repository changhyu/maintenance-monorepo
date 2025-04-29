/**
 * 앱 설정 정보
 */
// 환경별 설정
const configs = {
    development: {
        apiUrl: 'http://localhost:8000/api',
        appName: '차량 정비 관리 시스템',
        version: '0.1.0',
        environment: 'development',
        notificationSettings: {
            enableDesktopNotifications: true,
            defaultReminderTime: 3,
            storageQuota: 100,
            overdueRemindInterval: 1,
            autoMarkReadAfter: 7,
            prioritizedTypes: ['overdue', 'priority_high', 'upcoming_due'],
            reminderTimes: [1, 3, 7],
            silentHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
            }
        },
        pwaSettings: {
            enableServiceWorker: true,
            enablePushNotifications: true,
            cacheStrategy: 'network-first',
            offlineCapabilities: {
                enableOfflineMode: true,
                cacheExpiration: 72, // 3일
                maxCacheSize: 50, // 50MB
                priorityResources: ['/index.html', '/manifest.json', '/static/js/main.js', '/static/css/main.css']
            },
            syncSettings: {
                enableBackgroundSync: true,
                retryInterval: 15, // 15분
                maxRetries: 5,
                syncOnReconnect: true
            }
        },
        dateFormat: 'YYYY-MM-DD',
        maxConcurrentRequests: 5,
        featureFlags: {
            enableTemplates: true,
            enableReports: true,
            enablePredictiveMaintenance: true,
            enableDarkMode: true,
            enableNotificationFiltering: true,
            enableNotificationCustomization: true
        }
    },
    test: {
        apiUrl: 'https://test-api.car-goro.com/api',
        appName: '차량 정비 관리 시스템',
        version: '0.1.0',
        environment: 'test',
        notificationSettings: {
            enableDesktopNotifications: true,
            defaultReminderTime: 3,
            storageQuota: 100,
            overdueRemindInterval: 1,
            autoMarkReadAfter: 7,
            prioritizedTypes: ['overdue', 'priority_high', 'upcoming_due'],
            reminderTimes: [1, 3, 7],
            silentHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
            }
        },
        pwaSettings: {
            enableServiceWorker: true,
            enablePushNotifications: true,
            cacheStrategy: 'network-first',
            offlineCapabilities: {
                enableOfflineMode: true,
                cacheExpiration: 72, // 3일
                maxCacheSize: 50, // 50MB
                priorityResources: ['/index.html', '/manifest.json', '/static/js/main.js', '/static/css/main.css']
            },
            syncSettings: {
                enableBackgroundSync: true,
                retryInterval: 30, // 30분
                maxRetries: 5,
                syncOnReconnect: true
            }
        },
        dateFormat: 'YYYY-MM-DD',
        maxConcurrentRequests: 5,
        featureFlags: {
            enableTemplates: true,
            enableReports: true,
            enablePredictiveMaintenance: true,
            enableDarkMode: true,
            enableNotificationFiltering: true,
            enableNotificationCustomization: true
        }
    },
    production: {
        apiUrl: 'https://api.car-goro.com/api',
        appName: '차량 정비 관리 시스템',
        version: '0.1.0',
        environment: 'production',
        notificationSettings: {
            enableDesktopNotifications: true,
            defaultReminderTime: 3,
            storageQuota: 100,
            overdueRemindInterval: 1,
            autoMarkReadAfter: 14,
            prioritizedTypes: ['overdue', 'priority_high', 'upcoming_due'],
            reminderTimes: [1, 3, 7],
            silentHours: {
                enabled: true,
                start: '22:00',
                end: '08:00'
            }
        },
        pwaSettings: {
            enableServiceWorker: true,
            enablePushNotifications: true,
            cacheStrategy: 'stale-while-revalidate',
            offlineCapabilities: {
                enableOfflineMode: true,
                cacheExpiration: 168, // 7일
                maxCacheSize: 100, // 100MB
                priorityResources: ['/index.html', '/manifest.json', '/static/js/main.js', '/static/css/main.css']
            },
            syncSettings: {
                enableBackgroundSync: true,
                retryInterval: 60, // 60분
                maxRetries: 10,
                syncOnReconnect: true
            }
        },
        dateFormat: 'YYYY-MM-DD',
        maxConcurrentRequests: 10,
        featureFlags: {
            enableTemplates: true,
            enableReports: true,
            enablePredictiveMaintenance: true,
            enableDarkMode: true,
            enableNotificationFiltering: true,
            enableNotificationCustomization: true
        }
    }
};
// 현재 환경 설정
const env = import.meta.env.MODE || 'development';
const config = configs[env] || configs.development;
export default config;
