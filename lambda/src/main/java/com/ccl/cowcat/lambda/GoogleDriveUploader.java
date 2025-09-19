package com.ccl.cowcat.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.client.http.ByteArrayContent;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

public class GoogleDriveUploader implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final String APPLICATION_NAME = "CCL-Cow-Cat-Uploader";
    private static final String ROOT_FOLDER_ID = System.getenv("VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID");

    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    static class Input {
        String audioBase64;
        String filename;
        String clientIP;
    }

    static class Output {
        String fileId;
        String webViewLink;
        String message;
    }

    @Override
    public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context) {
        // Parse input body
        String rawBody = event.getBody();
        Input input = null;
        try {
            input = gson.fromJson(rawBody, Input.class);
        } catch (Exception e) {
            return generateResponse(400, Map.of("message", "Invalid JSON input"));
        }

        context.getLogger().log("Parsed input: " + gson.toJson(input));

        // Validate input fields
        if (input.audioBase64 == null || input.audioBase64.isEmpty()) {
            return generateResponse(400, Map.of("message", "Error: audioBase64 is null or empty"));
        }
        if (input.clientIP == null || input.clientIP.isEmpty()) {
            return generateResponse(400, Map.of("message", "Error: clientIP is null or empty"));
        }

        Output output = new Output();
        output.message = "Upload failed";

        try {
            validateEnvironmentVariables(context);
            NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
            GoogleCredential credential = getGoogleCredential(httpTransport, context);

            Drive driveService = new Drive.Builder(httpTransport, JSON_FACTORY, credential)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            String dateFolderName = formatFolderDate(new Date());

            String ipFolderId = findOrCreateFolder(driveService, input.clientIP, ROOT_FOLDER_ID, context);
            String dateFolderId = findOrCreateFolder(driveService, dateFolderName, ipFolderId, context);

            byte[] decodedAudio = Base64.getDecoder().decode(input.audioBase64);
            File uploadedFile = uploadAudio(driveService, decodedAudio, input.filename, dateFolderId, context);

            output.fileId = uploadedFile.getId();
            output.webViewLink = uploadedFile.getWebViewLink();
            output.message = "Upload successful";

        } catch (IllegalArgumentException e) {
            output.message = "Configuration Error: " + e.getMessage();
        } catch (IOException | GeneralSecurityException e) {
            output.message = "Google Drive API Error: " + e.getMessage();
        } catch (Exception e) {
            output.message = "Unexpected error: " + e.getMessage();
        }

        return generateResponse(200, output);
    }

    private APIGatewayV2HTTPResponse generateResponse(int statusCode, Object bodyObj) {
        APIGatewayV2HTTPResponse response = new APIGatewayV2HTTPResponse();
        response.setStatusCode(statusCode);
        response.setHeaders(Map.of("Content-Type", "application/json"));
        response.setBody(gson.toJson(bodyObj));
        return response;
    }

    private void validateEnvironmentVariables(Context context) {
        List<String> requiredEnvVars = Arrays.asList(
                "VITE_GOOGLE_TYPE",
                "VITE_GOOGLE_PROJECT_ID",
                "VITE_GOOGLE_PRIVATE_KEY_ID",
                "VITE_GOOGLE_PRIVATE_KEY",
                "VITE_GOOGLE_CLIENT_EMAIL",
                "VITE_GOOGLE_CLIENT_ID",
                "VITE_GOOGLE_TOKEN_URI",
                "VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID"
        );
        for (String var : requiredEnvVars) {
            String value = System.getenv(var);
            if (value == null || value.isEmpty()) {
                throw new IllegalArgumentException("Missing required environment variable: " + var);
            }
        }
    }

    private GoogleCredential getGoogleCredential(NetHttpTransport transport, Context context)
            throws GeneralSecurityException, IOException {
        String pem = System.getenv("VITE_GOOGLE_PRIVATE_KEY").replace("\\n", "\n");
        String keyContent = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decodedKey = Base64.getDecoder().decode(keyContent);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decodedKey);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        PrivateKey privateKey = kf.generatePrivate(keySpec);

        return new GoogleCredential.Builder()
                .setTransport(transport)
                .setJsonFactory(JSON_FACTORY)
                .setServiceAccountId(System.getenv("VITE_GOOGLE_CLIENT_EMAIL"))
                .setServiceAccountPrivateKeyId(System.getenv("VITE_GOOGLE_PRIVATE_KEY_ID"))
                .setServiceAccountScopes(Collections.singleton(DriveScopes.DRIVE_FILE))
                .setServiceAccountPrivateKey(privateKey)
                .build();
    }

    private String formatFolderDate(Date date) {
        return new SimpleDateFormat("yyyy年MM月dd日").format(date);
    }

    private File uploadAudio(Drive driveService, byte[] data, String filename,
                             String parentFolderId, Context context) throws IOException {
        File meta = new File();
        meta.setName(filename);
        meta.setParents(Collections.singletonList(parentFolderId));
        ByteArrayContent content = new ByteArrayContent("audio/webm", data);
        Drive.Files.Create req = driveService.files().create(meta, content)
                .setFields("id,webViewLink");
        return req.execute();
    }

    private String findOrCreateFolder(Drive driveService, String name,
                                      String parentId, Context context) throws IOException {
        String q = String.format(
                "mimeType='application/vnd.google-apps.folder' and name='%s' and '%s' in parents and trashed=false",
                name, parentId);
        var list = driveService.files().list().setQ(q).setFields("files(id,name)").execute().getFiles();
        if (!list.isEmpty()) {
            return list.get(0).getId();
        }
        File folderMeta = new File();
        folderMeta.setName(name);
        folderMeta.setMimeType("application/vnd.google-apps.folder");
        folderMeta.setParents(Collections.singletonList(parentId));
        File folder = driveService.files().create(folderMeta)
                .setFields("id,name").execute();
        return folder.getId();
    }
}
