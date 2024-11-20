import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// Helper function to generate a unique file name
function generateUniqueFileName(file: Express.Multer.File) {
    const extension = path.extname(file.originalname);
    const filename = path.basename(file.originalname, extension);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    return `${filename}-${uniqueSuffix}${extension}`;
}

// Upload function to handle single file upload
async function uploadFileToS3(file: Express.Multer.File): Promise<any> {
    const uniqueFileName = generateUniqueFileName(file);
    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const upload = new Upload({
        client: s3,
        params: uploadParams,
    });

    await upload.done();
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME!}.s3.ap-south-1.amazonaws.com/${uniqueFileName}`;
    return {
        url: fileUrl,
        key: uniqueFileName,
    };
}

// Optional: Image processing function (e.g., resizing)
async function processImage(file: Express.Multer.File): Promise<Buffer> {
    return await sharp(file.buffer)
        .resize({ width: 300 }) // Example resize operation
        .toBuffer();
}

// Main function for single file upload
export async function handleSingleFileUpload(req: Express.Request, file: Express.Multer.File) {
    try {
        let finalFileBuffer: Buffer | undefined;

        // Check if the file is an image and process it
        if (file.mimetype.startsWith("image/")) {
            finalFileBuffer = await processImage(file);
        }

        // Use the processed buffer if available, otherwise original
        const fileBuffer = finalFileBuffer || file.buffer;

        // Upload the file to S3
        const data = await uploadFileToS3({
            ...file,
            buffer: fileBuffer, // Use final buffer (processed or original)
        });

        return {
            success: true,
            message: "File uploaded successfully",
            uploadData: data, // Contains S3 URL and file key
        };
    } catch (err) {
        console.error("Error uploading file:", err);
        return {
            success: false,
            message: "File upload failed",
        };
    }
}

export async function deleteFromS3(key: string): Promise<{ success: boolean; message: string }> {
    try {
        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key,  // The unique key of the file in S3
        };

        const command = new DeleteObjectCommand(deleteParams);
        await s3.send(command);

        console.log(`File with key ${key} deleted successfully.`);
        return { success: true, message: "File deleted successfully." };
    } catch (error) {
        console.error("Error deleting file from S3:", error);
        return { success: false, message: "Error deleting file from S3." };
    }
}