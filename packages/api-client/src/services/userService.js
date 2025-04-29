export class UserService {
    constructor(apiClient) {
        this.basePath = '/users';
        this.authPath = '/auth';
        this.client = apiClient;
    }
    // 사용자 로그인
    async login(credentials) {
        return this.client.post(`${this.authPath}/login`, credentials);
    }
    // 사용자 로그아웃
    async logout() {
        return this.client.post(`${this.authPath}/logout`);
    }
    // 모든 사용자 조회
    async getAllUsers() {
        return this.client.get(this.basePath);
    }
    // 특정 사용자 조회
    async getUserById(id) {
        return this.client.get(`${this.basePath}/${id}`);
    }
    // 현재 로그인한 사용자 정보 조회
    async getCurrentUser() {
        return this.client.get(`${this.basePath}/me`);
    }
    // 사용자 생성
    async createUser(userData) {
        return this.client.post(this.basePath, userData);
    }
    // 사용자 정보 업데이트
    async updateUser(id, userData) {
        return this.client.put(`${this.basePath}/${id}`, userData);
    }
    // 사용자 삭제
    async deleteUser(id) {
        return this.client.delete(`${this.basePath}/${id}`);
    }
    // 사용자 비밀번호 변경
    async changePassword(userId, data) {
        return this.client.post(`${this.basePath}/${userId}/password`, data);
    }
    // 본인 비밀번호 변경
    async changeOwnPassword(data) {
        return this.client.post(`${this.basePath}/me/password`, data);
    }
    // 특정 역할을 가진 사용자 조회
    async getUsersByRole(role) {
        return this.client.get(`${this.basePath}/role/${role}`);
    }
}
