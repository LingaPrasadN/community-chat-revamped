::hides the commands
@echo off

echo ==================================================================================
echo Building the Project...
echo ==================================================================================

call mvn clean package -DskipTests

echo ==================================================================================
echo Build completed Successfully...
echo ==================================================================================

cd target

java -jar community-chat-revamped-backend-0.0.1-SNAPSHOT.jar

pause



