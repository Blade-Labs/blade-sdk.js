export interface CustomError extends Error {
    name: string;
    reason: string;
};
