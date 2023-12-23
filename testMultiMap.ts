import {MultiMap} from "./models/checksumMap";
import {groupBy} from "./utils/groupBy";

// interface ABC {
//     type: string;
// }

class ABC {
    constructor(private type: string) {
    }
}


const map = new MultiMap<ABC, string>()


map.push(new ABC("kkk"), "value1")
map.push(new ABC("kkk1"), "value2")
map.push(new ABC("kkk"), "value3")
map.push(new ABC("kkk"), "value312")

const group = groupBy([{abc: "kk"}, {abc: "iujiuj"}, {abc: "ppo"}], (k) => k.abc)

console.log(map)