import { readJson, writeJson } from "../lib/fs-json.js";
import { nextId } from "../lib/ids.js";
import { UserSchema, UserInputSchema } from "../schemas/user.schema.js";

const DATA_PATH = "./src/data/users.json";

export const userService = {
  async list() {
    const users = await readJson<Array<unknown>>(DATA_PATH, []);
    return users as Array<import("../schemas/user.schema.js").User>;
  },

  async getById(id: number) {
    const users = await this.list();
    return users.find((u) => u.id === id) ?? null;
  },

  async create(input: import("../schemas/user.schema.js").UserInput) {
    const parsed = UserInputSchema.parse(input);
    const users = await readJson<Array<unknown>>(DATA_PATH, []);
    const id = nextId(users.map((u: any) => (u as any).id as number));
    const newUser = { id, ...parsed };
    users.push(newUser);
    await writeJson(DATA_PATH, users);
    return id;
  },

  async deleteById(id: number) {
    const users = await this.list();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return false;
    users.splice(idx, 1);
    await writeJson(DATA_PATH, users);
    return true;
  },

  async deleteByName(name: string) {
    const users = await this.list();
    const before = users.length;
    const remaining = users.filter(
      (u) => (u.name ?? "").toLowerCase() !== name.toLowerCase()
    );
    const deleted = before - remaining.length;
    if (deleted > 0) {
      await writeJson(DATA_PATH, remaining);
    }
    return deleted;
  },
};
