INSERT INTO "User" (id, email, "passwordHash", role, status, "createdAt", "updatedAt")
VALUES ('seed-super-admin-001', 'admin@globanic.com', '$2a$12$Qo.DXO.VDKryYYlq4yPlzucOJIo6LTNf.e1lNwKoFBta5N8yC0lbK', 'SUPER_ADMIN', 'ACTIVE', now(), now());

INSERT INTO "Profile" (id, "userId", "fullName", "createdAt", "updatedAt")
VALUES ('seed-super-admin-profile-001', 'seed-super-admin-001', 'Globanic Super Admin', now(), now());
