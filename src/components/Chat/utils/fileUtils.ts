/**
 * 文件处理工具函数
 */

/**
 * 支持图片显示的文件类型
 */
const IMAGE_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'
];

/**
 * 文档类型扩展名
 */
const DOCUMENT_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'
];

/**
 * 表格类型扩展名
 */
const SPREADSHEET_EXTENSIONS = [
    'xls', 'xlsx', 'csv', 'ods'
];

/**
 * 演示文稿类型扩展名
 */
const PRESENTATION_EXTENSIONS = [
    'ppt', 'pptx', 'odp'
];

/**
 * 压缩文件类型扩展名
 */
const ARCHIVE_EXTENSIONS = [
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2'
];

/**
 * 检查文件类型是否支持图片显示
 */
export const showImage = (fileType: string): boolean => {
    if (!fileType) return false;

    const extension = fileType.toLowerCase().replace('.', '');
    return IMAGE_EXTENSIONS.includes(extension);
};

/**
 * 获取文件类型对应的图标路径
 */
export const getIconPath = (fileType: string): string => {
    if (!fileType) return '/icons/file-unknown.svg';

    const extension = fileType.toLowerCase().replace('.', '');

    if (IMAGE_EXTENSIONS.includes(extension)) {
        return '/icons/file-image.svg';
    }

    if (DOCUMENT_EXTENSIONS.includes(extension)) {
        return '/icons/file-document.svg';
    }

    if (SPREADSHEET_EXTENSIONS.includes(extension)) {
        return '/icons/file-spreadsheet.svg';
    }

    if (PRESENTATION_EXTENSIONS.includes(extension)) {
        return '/icons/file-presentation.svg';
    }

    if (ARCHIVE_EXTENSIONS.includes(extension)) {
        return '/icons/file-archive.svg';
    }

    // 特殊文件类型
    switch (extension) {
        case 'mp3':
        case 'wav':
        case 'flac':
        case 'aac':
            return '/icons/file-audio.svg';
        case 'mp4':
        case 'avi':
        case 'mkv':
        case 'mov':
            return '/icons/file-video.svg';
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'html':
        case 'css':
        case 'py':
        case 'java':
        case 'cpp':
        case 'c':
            return '/icons/file-code.svg';
        default:
            return '/icons/file-unknown.svg';
    }
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 检查文件是否为文档类型
 */
export const isDocumentType = (fileType: string): boolean => {
    if (!fileType) return false;

    const extension = fileType.toLowerCase().replace('.', '');
    return DOCUMENT_EXTENSIONS.includes(extension);
};

/**
 * 检查文件是否为表格类型
 */
export const isSpreadsheetType = (fileType: string): boolean => {
    if (!fileType) return false;

    const extension = fileType.toLowerCase().replace('.', '');
    return SPREADSHEET_EXTENSIONS.includes(extension);
};

/**
 * 检查文件是否为演示文稿类型
 */
export const isPresentationType = (fileType: string): boolean => {
    if (!fileType) return false;

    const extension = fileType.toLowerCase().replace('.', '');
    return PRESENTATION_EXTENSIONS.includes(extension);
};

/**
 * 检查文件是否为图片类型
 */
export const isImageType = (fileType: string): boolean => {
    return showImage(fileType);
};

/**
 * 检查文件是否为压缩文件类型
 */
export const isArchiveType = (fileType: string): boolean => {
    if (!fileType) return false;

    const extension = fileType.toLowerCase().replace('.', '');
    return ARCHIVE_EXTENSIONS.includes(extension);
};

/**
 * 获取文件类型的显示名称
 */
export const getFileTypeDisplayName = (fileType: string): string => {
    if (!fileType) return '未知文件';

    const extension = fileType.toLowerCase().replace('.', '');

    const typeMap: Record<string, string> = {
        // 图片
        'jpg': 'JPEG 图片',
        'jpeg': 'JPEG 图片',
        'png': 'PNG 图片',
        'gif': 'GIF 图片',
        'bmp': 'BMP 图片',
        'webp': 'WebP 图片',
        'svg': 'SVG 图片',
        'ico': 'ICO 图标',

        // 文档
        'pdf': 'PDF 文档',
        'doc': 'Word 文档',
        'docx': 'Word 文档',
        'txt': '文本文件',
        'rtf': 'RTF 文档',
        'odt': 'OpenDocument 文本',

        // 表格
        'xls': 'Excel 表格',
        'xlsx': 'Excel 表格',
        'csv': 'CSV 文件',
        'ods': 'OpenDocument 表格',

        // 演示文稿
        'ppt': 'PowerPoint 演示文稿',
        'pptx': 'PowerPoint 演示文稿',
        'odp': 'OpenDocument 演示文稿',

        // 压缩文件
        'zip': 'ZIP 压缩文件',
        'rar': 'RAR 压缩文件',
        '7z': '7-Zip 压缩文件',
        'tar': 'TAR 归档文件',
        'gz': 'GZ 压缩文件',
        'bz2': 'BZ2 压缩文件',

        // 音频
        'mp3': 'MP3 音频',
        'wav': 'WAV 音频',
        'flac': 'FLAC 音频',
        'aac': 'AAC 音频',

        // 视频
        'mp4': 'MP4 视频',
        'avi': 'AVI 视频',
        'mkv': 'MKV 视频',
        'mov': 'MOV 视频',

        // 代码
        'js': 'JavaScript 文件',
        'ts': 'TypeScript 文件',
        'jsx': 'React JSX 文件',
        'tsx': 'React TSX 文件',
        'html': 'HTML 文件',
        'css': 'CSS 文件',
        'py': 'Python 文件',
        'java': 'Java 文件',
        'cpp': 'C++ 文件',
        'c': 'C 文件'
    };

    return typeMap[extension] || `${extension.toUpperCase()} 文件`;
};

/**
 * 验证文件名是否合法
 */
export const isValidFilename = (filename: string): boolean => {
    if (!filename || filename.trim().length === 0) return false;

    // 检查非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filename)) return false;

    // 检查保留名称（Windows）
    const reservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) return false;

    return true;
};

/**
 * 从文件名中提取扩展名
 */
export const getFileExtension = (filename: string): string => {
    if (!filename) return '';

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) return '';

    return filename.substring(lastDotIndex + 1).toLowerCase();
};

/**
 * 从文件名中提取基础名称（不包含扩展名）
 */
export const getFileBasename = (filename: string): string => {
    if (!filename) return '';

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;

    return filename.substring(0, lastDotIndex);
};