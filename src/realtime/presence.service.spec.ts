import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  it('should track first connection and return isFirstConnection = true', () => {
    const isFirst = service.addConnection('user-1', 'socket-1');
    expect(isFirst).toBe(true);
    expect(service.isUserOnline('user-1')).toBe(true);
    expect(service.getUserSocketIds('user-1')).toEqual(['socket-1']);
  });

  it('should support multiple devices/tabs for same user', () => {
    const first = service.addConnection('user-1', 'socket-tab-1');
    const second = service.addConnection('user-1', 'socket-phone-2');

    expect(first).toBe(true);
    expect(second).toBe(false); // Already online on tab 1
    expect(service.getUserSocketIds('user-1')).toHaveLength(2);
    expect(service.getUserSocketIds('user-1')).toContain('socket-tab-1');
    expect(service.getUserSocketIds('user-1')).toContain('socket-phone-2');
  });

  it('should remain online when one device disconnects but other is active', () => {
    service.addConnection('user-1', 'socket-1');
    service.addConnection('user-1', 'socket-2');

    const result = service.removeConnection('socket-1');
    expect(result?.isOffline).toBe(false);
    expect(service.isUserOnline('user-1')).toBe(true);
    expect(service.getUserSocketIds('user-1')).toEqual(['socket-2']);
  });

  it('should transition to offline when all sockets disconnect', () => {
    service.addConnection('user-1', 'socket-1');

    const result = service.removeConnection('socket-1');
    expect(result?.isOffline).toBe(true);
    expect(service.isUserOnline('user-1')).toBe(false);
    expect(service.getLastSeen('user-1')).toBeInstanceOf(Date);
  });

  it('should list all online users', () => {
    service.addConnection('user-1', 's1');
    service.addConnection('user-2', 's2');
    service.addConnection('user-3', 's3');

    expect(service.getOnlineUsers()).toHaveLength(3);
    expect(service.getOnlineUsers()).toContain('user-1');
    expect(service.getOnlineUsers()).toContain('user-2');
    expect(service.getOnlineUsers()).toContain('user-3');
  });
});
