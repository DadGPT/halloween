const pulumi = require("@pulumi/pulumi");
const gcp = require("@pulumi/gcp");

// Create a Google Cloud Storage bucket for uploading images
const bucket = new gcp.storage.Bucket("halloween-contest-images", {
    name: "halloween-contest-images-" + Math.random().toString(36).substring(7),
    location: "US",
    uniformBucketLevelAccess: true,
    publicAccessPrevention: "unspecified",
    cors: [{
        origins: ["*"],
        methods: ["GET", "POST", "PUT"],
        responseHeaders: ["*"],
        maxAgeSeconds: 3600,
    }],
});

// Make the bucket publicly readable
const bucketIAMBinding = new gcp.storage.BucketIAMBinding("bucket-public-read", {
    bucket: bucket.name,
    role: "roles/storage.objectViewer",
    members: ["allUsers"],
});

// Create a service account for the application
const serviceAccount = new gcp.serviceaccount.Account("halloween-contest-sa", {
    accountId: "halloween-contest-sa",
    displayName: "Halloween Contest Service Account",
});

// Create a key for the service account
const serviceAccountKey = new gcp.serviceaccount.Key("halloween-contest-key", {
    serviceAccountId: serviceAccount.name,
    publicKeyType: "TYPE_X509_PEM_FILE",
});

// Grant the service account permission to read/write to the bucket
const bucketIAMPermission = new gcp.storage.BucketIAMMember("bucket-admin", {
    bucket: bucket.name,
    role: "roles/storage.objectAdmin",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Export the bucket name and service account key
exports.bucketName = bucket.name;
exports.bucketUrl = pulumi.interpolate`gs://${bucket.name}`;
exports.serviceAccountEmail = serviceAccount.email;
exports.serviceAccountKey = serviceAccountKey.privateKey;