import "dotenv/config";
import { ConnectDB } from "./config/db.js";
import { User } from "./models/user.model.js";

async function test() {
  ConnectDB();

  const user = await User.findOne().lean();
}

export default test;
