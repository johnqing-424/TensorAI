/**
 * 文件处理工具函数
 */

/**
 * 支持图片显示的文件类型
 */
const IMAGE_SUPPORTED_TYPES = [
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'svg',
    'webp'
];

/**
 * 检查文件类型是否支持图片显示
 * @param fileType 文件类型
 * @returns 是否支持图片显示
 */
export const showImage = (fileType: string): boolean => {
    if (!fileType) return false;
    return IMAGE_SUPPORTED_TYPES.includes(fileType.toLowerCase());
};

/**
 * 获取文件类型对应的图标路径
 * @param extension 文件扩展名
 * @returns SVG图标路径
 */
export const getIconPath = (extension: string): string => {
    const ext = extension?.toLowerCase() || '';

    switch (ext) {
        case 'pdf':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z';
        case 'doc':
        case 'docx':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M7,13H17V15H7V13M7,16H17V18H7V16M7,10H17V12H7V10Z';
        case 'xls':
        case 'xlsx':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M8,12V14H10V12H8M10,14V16H8V14H10M12,12V14H14V12H12M14,14V16H12V14H14M16,12V14H18V12H16M18,14V16H16V14H18Z';
        case 'ppt':
        case 'pptx':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M8,11H16V13H8V11M8,14H13V16H8V14M8,17H16V19H8V17Z';
        case 'txt':
        case 'md':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M7,13H17V15H7V13M7,16H17V18H7V16M7,10H17V12H7V10Z';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'bmp':
        case 'svg':
        case 'webp':
            return 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z';
        case 'zip':
        case 'rar':
        case '7z':
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,11A1,1 0 0,1 13,12A1,1 0 0,1 12,13A1,1 0 0,1 11,12A1,1 0 0,1 12,11M8,15H16V17H8V15Z';
        default:
            return 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z';
    }
};

/**
 * 获取文件大小的人类可读格式
 * @param bytes 字节数
 * @returns 格式化的文件大小
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 检查文件类型是否为文档类型
 * @param fileType 文件类型
 * @returns 是否为文档类型
 */
export const isDocumentType = (fileType: string): boolean => {
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
    return documentTypes.includes(fileType?.toLowerCase() || '');
};

/**
 * 检查文件类型是否为表格类型
 * @param fileType 文件类型
 * @returns 是否为表格类型
 */
export const isSpreadsheetType = (fileType: string): boolean => {
    const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
    return spreadsheetTypes.includes(fileType?.toLowerCase() || '');
};

/**
 * 检查文件类型是否为演示文稿类型
 * @param fileType 文件类型
 * @returns 是否为演示文稿类型
 */
export const isPresentationType = (fileType: string): boolean => {
    const presentationTypes = ['ppt', 'pptx'];
    return presentationTypes.includes(fileType?.toLowerCase() || '');
};

/**
 * 检查文件类型是否为图片类型
 * @param fileType 文件类型
 * @returns 是否为图片类型
 */
export const isImageType = (fileType: string): boolean => {
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];
    return imageTypes.includes(fileType?.toLowerCase() || '');
};

/**
 * 检查文件类型是否为压缩文件类型
 * @param fileType 文件类型
 * @returns 是否为压缩文件类型
 */
export const isArchiveType = (fileType: string): boolean => {
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];
    return archiveTypes.includes(fileType?.toLowerCase() || '');
};

/**
 * 获取文件类型的显示名称
 * @param fileType 文件类型
 * @returns 文件类型的显示名称
 */
export const getFileTypeDisplayName = (fileType: string): string => {
    const typeNames: Record<string, string> = {
        'pdf': 'PDF文档',
        'doc': 'Word文档',
        'docx': 'Word文档',
        'xls': 'Excel表格',
        'xlsx': 'Excel表格',
        'ppt': 'PowerPoint演示',
        'pptx': 'PowerPoint演示',
        'txt': '文本文件',
        'md': 'Markdown文档',
        'png': 'PNG图片',
        'jpg': 'JPEG图片',
        'jpeg': 'JPEG图片',
        'gif': 'GIF图片',
        'bmp': 'BMP图片',
        'svg': 'SVG图片',
        'webp': 'WebP图片',
        'zip': 'ZIP压缩包',
        'rar': 'RAR压缩包',
        '7z': '7Z压缩包'
    };

    return typeNames[fileType?.toLowerCase() || ''] || '未知文件类型';
};

/**
 * 验证文件名是否合法
 * @param filename 文件名
 * @returns 是否合法
 */
export const isValidFilename = (filename: string): boolean => {
    if (!filename || filename.trim().length === 0) return false;

    // 检查非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filename)) return false;

    // 检查保留名称（Windows）
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(filename)) return false;

    // 检查长度
    if (filename.length > 255) return false;

    return true;
};

/**
 * 从文件名中提取扩展名
 * @param filename 文件名
 * @returns 扩展名（不包含点号）
 */
export const getFileExtension = (filename: string): string => {
    if (!filename) return '';

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) return '';

    return filename.substring(lastDotIndex + 1).toLowerCase();
};

/**
 * 从文件名中提取基础名称（不包含扩展名）
 * @param filename 文件名
 * @returns 基础名称
 */
export const getFileBasename = (filename: string): string => {
    if (!filename) return '';

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;

    return filename.substring(0, lastDotIndex);
};