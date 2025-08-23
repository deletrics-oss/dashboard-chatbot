const { randomUUID } = require('crypto');

class MemStorage {
    constructor() {
        this.messages = new Map();
        this.chatbotUsers = new Map();
        this.systemLogs = new Map();
    }

    async createMessage({ phoneNumber, content, isFromBot }) {
        const id = randomUUID();
        const msg = { id, phoneNumber, content, isFromBot, timestamp: new Date() };
        this.messages.set(id, msg);
        return msg;
    }

    async getMessages(phoneNumber, limit) {
        return Array.from(this.messages.values())
            .filter(msg => msg.phoneNumber === phoneNumber)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    async getTodayMessageCount() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from(this.messages.values())
            .filter(msg => msg.timestamp >= today).length;
    }

    async createChatbotUser({ phoneNumber, userName = null, currentState = null, sessionData = {} }) {
        const id = randomUUID();
        const user = { id, phoneNumber, userName, currentState, sessionData, lastActivity: new Date() };
        this.chatbotUsers.set(phoneNumber, user);
        return user;
    }

    async updateChatbotUser(phoneNumber, updates) {
        const existingUser = this.chatbotUsers.get(phoneNumber);
        if (existingUser) {
            const updatedUser = { ...existingUser, ...updates, lastActivity: new Date() };
            this.chatbotUsers.set(phoneNumber, updatedUser);
            return updatedUser;
        }
        return this.createChatbotUser({ phoneNumber, ...updates });
    }

    async getActiveUsers() {
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
        return Array.from(this.chatbotUsers.values())
            .filter(user => user.lastActivity >= thirtyMinutesAgo)
            .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }

    async getActiveUsersCount() {
        return (await this.getActiveUsers()).length;
    }

    async endUserSession(phoneNumber) {
        this.chatbotUsers.delete(phoneNumber);
    }

    async createSystemLog({ type, message, data = null }) {
        const id = randomUUID();
        const log = { id, type, message, data, timestamp: new Date() };
        this.systemLogs.set(id, log);
        return log;
    }

    async getSystemLogs(limit) {
        return Array.from(this.systemLogs.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    async clearSystemLogs() {
        this.systemLogs.clear();
    }
}

module.exports = { storage: new MemStorage() };
