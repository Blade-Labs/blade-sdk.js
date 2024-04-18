export const flatArray = (array: any[]): any[] => {
    const result: any[] = [];

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
