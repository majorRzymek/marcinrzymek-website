    function initGameForEmbed() {
        const gameContainer = document.querySelector('.game-container-embedded');
        if (!gameContainer) {
            console.error("Embedded game container not found.");
            return;
        }

        const characterContainer = document.getElementById('character-container-embedded');
        const characterFrames = [
            document.getElementById('character-frame1-embedded'),
            document.getElementById('character-frame2-embedded')
        ];
        const obstaclesContainer = document.getElementById('obstacles-container-embedded');
        const footerElement = document.querySelector('body .footer');

        let gameWidth = gameContainer.offsetWidth;
        let gameHeight = gameContainer.offsetHeight;
        let groundLevel = 0;

        let currentCharacterFrame = 0;
        let frameCounter = 0;
        const runFrameRate = 10;
        let characterY = 0;
        let characterVelocityY = 0;
        const gravity = 0.5;

        // *** Tunable Variables ***
        let jumpPower = 10;
        let collisionThreshold = 0.5;
        let obstacleCollisionLeeway = 20;
        let mouseInfluence = 0.4;
        let maxMouseInfluence = gameWidth * 0.25;
        let returnSpeed = 0.05; // Added for smooth return speed.  Adjust to change how fast it returns.
        // *************************

        let isJumping = false;
        let characterBaseX = gameWidth * 0.5;
        let characterCurrentX = characterBaseX;
        const characterDriftSpeed = 0.1;
        const characterDriftMax = gameWidth * 0.25;
        const minX = gameWidth * 0.25;
        const maxX = gameWidth * 0.75;
        let targetX = characterBaseX; // Added:  Target X position for smooth return.

        let obstacles = [];
        const obstacleTypes = [
            {
                id: 'tree_detailed',
                svgWidth: 43, svgHeight: 57,
                html: `<svg class="obstacle-sprite-embedded" width="43" height="57" viewBox="0 0 43 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M31 6H37V12H43V22H38V26H40V32H35V36H28V39H26V57H16V36H13V32H8V26H5V22H0V12H5V6H10V2H18V6H22V0H31V6Z" fill="#FF4565"/>
                        </svg>`
            },
            {
                id: 'bush_detailed',
                svgWidth: 32, svgHeight: 26,
                html: `<svg class="obstacle-sprite-embedded" width="32" height="26" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.0693 6H27.5352V12H32V19H30.5117V23H25.0049V26H6.64746V23H2.97656V19H0V12H3.7207V6H7.44141V2H13.3955V6H16.3721V0H23.0693V6Z" fill="#FF4565"/>
                        </svg>`
            },
            {
                id: 'box',
                svgWidth: 30, svgHeight: 30,
                html: `<svg class="obstacle-sprite-embedded" width="30" height="30" viewBox="0 0 30 30"><g class="main-part"><rect width="30" height="30"/></g></svg>`
            }
        ];
        let obstacleSpeed = 4;
        let nextObstacleSpawnTime = 0;
        const minObstacleInterval = 1200;
        const maxObstacleInterval = 2500;

        let clouds = [];
        const numClouds = 7;
        const cloudTypes = [
            { id: 'cloud_var1', svgWidth: 36, svgHeight: 17, html: `<svg class="cloud-svg-embedded" width="36" height="17" viewBox="0 0 30 14" xmlns="http://www.w3.org/2000/svg"><path d="M13 4H17V0H22V4H30V11H24V14H4V11H0V4H5V0H13V4Z"/></svg>` },
            { id: 'cloud_var2', svgWidth: 52, svgHeight: 23, html: `<svg class="cloud-svg-embedded" width="52" height="23" viewBox="0 0 43 19" xmlns="http://www.w3.org/2000/svg"><path d="M31 6H37V12H43V19H0V12H5V6H10V2H18V6H22V0H31V6Z"/></svg>`},
            { id: 'cloud_var3', svgWidth: 38, svgHeight: 20, html: `<svg class="cloud-svg-embedded" width="38" height="20" viewBox="0 0 32 17" xmlns="http://www.w3.org/2000/svg"><path d="M23 3H27V7H32V13H29V17H4V13H0V7H5V3H12V0H23V3Z"/></svg>`}
        ];
        const cloudSpeed = 0.5;

        let animationFrameId;
        let gameIsRunning = false;
        let lastTimestamp = 0;
        let mouseX = 0;

        function setActiveCharacterFrame(frameIndex) {
            characterFrames.forEach((frame, index) => {
                if (frame) frame.style.display = (index === frameIndex) ? 'block' : 'none';
            });
        }

        function jump() {
            if (!isJumping) {
                isJumping = true;
                characterVelocityY = jumpPower;
            }
        }

        function spawnObstacle() {
            if (!obstaclesContainer) return;
            const typeIndex = Math.floor(Math.random() * obstacleTypes.length);
            const type = obstacleTypes[typeIndex];
            const obstacleWrapper = document.createElement('div');
            obstacleWrapper.className = 'obstacle-wrapper-embedded';
            obstacleWrapper.innerHTML = type.html;
            const obstacleSvgElement = obstacleWrapper.firstChild;
            if (obstacleSvgElement) {
                obstacleSvgElement.style.width = type.svgWidth + 'px';
                obstacleSvgElement.style.height = type.svgHeight + 'px';
            }
            obstacleWrapper.style.left = gameWidth + 'px';
            obstacleWrapper.dataset.width = type.svgWidth;
            obstacleWrapper.dataset.height = type.svgHeight;
            obstaclesContainer.appendChild(obstacleWrapper);
            obstacles.push(obstacleWrapper);
            nextObstacleSpawnTime = lastTimestamp + minObstacleInterval + Math.random() * (maxObstacleInterval - minObstacleInterval);
        }

        function spawnCloud(isInitial = false) {
            if (!gameContainer) return;
            const typeIndex = Math.floor(Math.random() * cloudTypes.length);
            const type = cloudTypes[typeIndex];

            const cloudWrapper = document.createElement('div');
            cloudWrapper.className = 'cloud-wrapper-embedded';
            cloudWrapper.innerHTML = type.html;

            let maxCloudTop = gameHeight / 2.5 - type.svgHeight;
            if (maxCloudTop < 5) maxCloudTop = 5;
            cloudWrapper.style.top = (5 + Math.random() * maxCloudTop) + 'px';

            cloudWrapper.style.left = isInitial ? (Math.random() * gameWidth) + 'px' : (gameWidth + Math.random() * (gameWidth / 3)) + 'px';
            cloudWrapper.dataset.width = type.svgWidth;

            gameContainer.appendChild(cloudWrapper);
            clouds.push(cloudWrapper);
        }

        function initializeClouds() {
            clouds.forEach(cloud => cloud.remove());
            clouds = [];
            for (let i = 0; i < numClouds; i++) {
                spawnCloud(true);
            }
        }

        function updateCharacter(deltaTime) {
            if (!characterContainer) return;
            if (!isJumping) {
                frameCounter++;
                if (frameCounter >= runFrameRate) {
                    currentCharacterFrame = (currentCharacterFrame + 1) % characterFrames.length;
                    setActiveCharacterFrame(currentCharacterFrame);
                    frameCounter = 0;
                }
            } else {
                setActiveCharacterFrame(0);
            }

            if (isJumping) {
                characterY += characterVelocityY;
                characterVelocityY -= gravity;
                if (characterY <= 0) {
                    characterY = 0;
                    characterVelocityY = 0;
                    isJumping = false;
                }
            }
            characterContainer.style.bottom = (groundLevel + characterY) + 'px';

            // Calculate mouse influence on X position
            let mouseOffset = (mouseX - gameWidth / 2) * mouseInfluence;
            mouseOffset = Math.max(-maxMouseInfluence, Math.min(maxMouseInfluence, mouseOffset));

            targetX = characterBaseX + mouseOffset; // Set target

            // Smoothly move towards the target X position
            if (Math.abs(characterCurrentX - targetX) > 0.5) { // Only move if far enough
                characterCurrentX += (targetX - characterCurrentX) * returnSpeed * (deltaTime / 16);
            } else {
                characterCurrentX = targetX; //snap
            }

            characterCurrentX = Math.max(minX, Math.min(maxX, characterCurrentX));
            characterContainer.style.left = characterCurrentX + 'px';
        }

        function updateObstacles(deltaTime) {
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obsWrapper = obstacles[i];
                if (!obsWrapper || !characterContainer) continue;

                let obsX = parseFloat(obsWrapper.style.left);
                obsX -= obstacleSpeed * (deltaTime / 16);
                obsWrapper.style.left = obsX + 'px';

                const charWidth = characterFrames[0] ? parseInt(characterFrames[0].getAttribute('width')) : 0;
                const charHeight = characterFrames[0] ? parseInt(characterFrames[0].getAttribute('height')) : 0;
                const charScreenX = characterContainer.offsetLeft;

                const obsDataWidth = parseInt(obsWrapper.dataset.width);
                const obsDataHeight = parseInt(obsWrapper.dataset.height);
                const obsScreenX = obsWrapper.offsetLeft;

                // Improved collision detection using the collisionThreshold
                if (
                    charScreenX < obsScreenX + obsDataWidth - obstacleCollisionLeeway &&
                    charScreenX + charWidth > obsScreenX + obstacleCollisionLeeway &&
                    characterY < obsDataHeight * collisionThreshold &&
                    (characterY + charHeight) > 0
                ) {
                    if (characterY < obsDataHeight * 0.8) {
                        if (obsScreenX < charScreenX + charWidth + 5 &&
                            obsScreenX + obsDataWidth > charScreenX &&
                            !isJumping && characterY === 0) {
                            jump();
                        }
                    }
                }

                if (obsX < -obsDataWidth) {
                    obsWrapper.remove();
                    obstacles.splice(i, 1);
                }
            }

            if (lastTimestamp > nextObstacleSpawnTime && obstacles.length < 3) {
                spawnObstacle();
            }
        }

        function updateClouds(deltaTime) {
            for (let i = clouds.length - 1; i >= 0; i--) {
                const cloudWrapper = clouds[i];
                if (!cloudWrapper) continue;
                let cloudX = parseFloat(cloudWrapper.style.left);
                cloudX -= cloudSpeed * (deltaTime / 16);
                cloudWrapper.style.left = cloudX + 'px';

                const cloudDataWidth = parseFloat(cloudWrapper.dataset.width) || 36;
                if (cloudX < -cloudDataWidth) {
                    cloudWrapper.remove();
                    clouds.splice(i, 1);
                    spawnCloud();
                }
            }
        }

        function gameLoop(timestamp) {
            if (!gameIsRunning) return;
            const deltaTime = lastTimestamp ? timestamp - lastTimestamp : 16.66;
            lastTimestamp = timestamp;

            updateCharacter(deltaTime);
            updateObstacles(deltaTime);
            updateClouds(deltaTime);

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function startGameEmbedded() {
            if (gameIsRunning || !characterContainer) return;
            gameIsRunning = true;
            characterY = 0;
            isJumping = false;
            characterCurrentX = characterBaseX;
            targetX = characterBaseX; // Initialize targetX
            if (characterContainer) {
                characterContainer.style.left = characterCurrentX + 'px';
                characterContainer.style.bottom = groundLevel + 'px';
            }
            setActiveCharacterFrame(0);
            obstacles.forEach(obs => obs.remove());
            obstacles = [];
            nextObstacleSpawnTime = performance.now();
            initializeClouds();
            lastTimestamp = performance.now();
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function stopGameEmbedded() {
            if (!gameIsRunning) return;
            gameIsRunning = false;
            cancelAnimationFrame(animationFrameId);
        }

        function handleResize() {
            if (!gameContainer) return;
            gameWidth = gameContainer.offsetWidth;
            gameHeight = gameContainer.offsetHeight;
            characterBaseX = gameWidth * 0.5;
            targetX = characterBaseX; // Reset targetX on resize
        }
        window.addEventListener('resize', handleResize);

        if (!footerElement) {
            console.warn("Embedded game: Footer element for IntersectionObserver not found. Starting game manually.");
            startGameEmbedded();
        } else {
            const observerOptions = { root: null, rootMargin: '0px', threshold: 0.01 };
            const observerCallback = (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (!gameIsRunning) startGameEmbedded();
                    } else {
                        if (gameIsRunning) stopGameEmbedded();
                    }
                });
            };
            const observer = new IntersectionObserver(observerCallback, observerOptions);
            observer.observe(footerElement);
        }

        setActiveCharacterFrame(0);
        initializeClouds();
        handleResize();

        if (gameContainer) {
            gameContainer.addEventListener('click', jump);
            gameContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                jump();
            });

            // Track mouse position over game container
            gameContainer.addEventListener('mousemove', (event) => {
                const rect = gameContainer.getBoundingClientRect();
                mouseX = event.clientX - rect.left;
            });

            // Reset mouseX when mouse leaves.  Start smooth return.
            gameContainer.addEventListener('mouseleave', () => {
                mouseX = gameWidth / 2;
                targetX = characterBaseX; // Start returning to center
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameForEmbed);
    } else {
        initGameForEmbed();
    }
