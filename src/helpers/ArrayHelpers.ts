export const flatArray = <T>(array: T[][]): T[] => {
    const result: T[] = [];

    if (array && Array.isArray(array)) {
        for (const value of array) {
            if (Array.isArray(value)) {
                result.push(...value);
            } else {
                result.push(value);
            }
        }
    }
    return result;
};
