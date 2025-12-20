-- CreateTable
CREATE TABLE "test" (
    "Test #" SERIAL NOT NULL,
    "Created at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Created By" TEXT NOT NULL,

    CONSTRAINT "test_pkey" PRIMARY KEY ("Test #")
);
