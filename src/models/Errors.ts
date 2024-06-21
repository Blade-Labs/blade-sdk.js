export interface CustomError extends Error {
    name: string;
    reason: string;
    _code?: number;
    _url?: string;
}
