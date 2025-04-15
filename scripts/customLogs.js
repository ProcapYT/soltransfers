import sc from "samcolors";

export function LOG(msg) {
    console.log(sc.bold(sc.blue("LOG: ")) + msg);
}

export function WARN(msg) {
    console.warn(sc.bold(sc.yellow("WARN: ")) + msg);
}

export function ERROR(msg) {
    console.error(sc.bold(sc.red("ERROR: ")) + msg);
}
