import journal from "./meta/_journal.json";
import m0000 from "./0000_ambiguous_nekra.sql";

const migrations = {
  journal,
  migrations: {
    m0000,
  },
};

export default migrations;
