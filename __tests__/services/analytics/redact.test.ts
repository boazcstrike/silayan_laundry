import { redactMongoError } from '@/lib/services/analytics/redact';

describe('redactMongoError', () => {
  it('strips user:password from a standard mongodb URI in the message', () => {
    const err = new Error(
      'connect failed for mongodb://alice:s3cr3t@host1:27017,host2:27017/?replicaSet=rs',
    );
    const out = redactMongoError(err);
    expect(out).not.toContain('s3cr3t');
    expect(out).not.toContain('alice:s3cr3t');
    expect(out).toContain('mongodb://<redacted>@host1:27017');
  });

  it('strips credentials from a mongodb+srv URI', () => {
    const out = redactMongoError(new Error('bad auth mongodb+srv://u:p@cluster.example.net/db'));
    expect(out).not.toContain('u:p');
    expect(out).toContain('mongodb+srv://<redacted>@cluster.example.net/db');
  });

  it('passes through messages without a connection string unchanged', () => {
    expect(redactMongoError(new Error('server selection timed out'))).toBe(
      'server selection timed out',
    );
  });

  it('handles non-Error values', () => {
    expect(redactMongoError('mongodb://a:b@h/')).toBe('mongodb://<redacted>@h/');
    expect(redactMongoError(null)).toBe('null');
  });
});
