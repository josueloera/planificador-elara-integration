export class SQLiteAdapter {
  constructor(native, database = 'user') { this.native = native; this.database = database; this.queue = Promise.resolve(); this.failure = null; }
  enqueue(work, callback, transform = x => x) {
    const operation = this.queue.then(work);
    this.queue = operation.then(value => { if (callback) callback(null, transform(value)); }).catch(error => {
      if (callback) callback(error); else this.failure ||= error;
    });
    return this;
  }
  all(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    return this.enqueue(() => this.native.query({ database: this.database, sql, params: params.map(x => x ?? null) }), callback, result => result.rows);
  }
  get(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    return this.all(sql, params, (error, rows) => callback?.(error, rows?.[0]));
  }
  run(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    const done = callback && ((error, result) => callback.call(result || { changes: 0, lastID: 0 }, error));
    return this.enqueue(() => this.native.execute({ database: this.database, sql, params: params.map(x => x ?? null) }), done);
  }
  serialize(work) { work(); return this; }
  prepare(sql) {
    const db = this;
    return { run(...args) { const callback = typeof args.at(-1) === 'function' ? args.pop() : undefined; db.run(sql, Array.isArray(args[0]) ? args[0] : args, callback); return this; },
      finalize(callback) { db.enqueue(async () => true, callback); } };
  }
  async flush() {
    let observed;
    do { observed = this.queue; await observed; } while (observed !== this.queue);
    if (this.failure) throw this.failure;
  }
}
