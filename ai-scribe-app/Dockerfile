FROM node:20

# Set the working directory in the container.
WORKDIR /app

# Install the required packages.
COPY package*.json ./
RUN npm install

# Make port 8000 available to outside the container.
EXPOSE 4000

# Environment
ENV NODE_ENV=production

# Disable Next.js telemetry.
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the current directory contents into the container.
COPY . ./

# Build the app.
RUN npm run build

# Run the app when the container launches.
CMD ["npm", "start"]