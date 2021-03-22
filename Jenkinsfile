#!/usr/bin/env groovy
pipeline {
    agent any
    tools { nodejs "node" }
    options {
        buildDiscarder(logRotator(daysToKeepStr: '90', artifactNumToKeepStr: '3'))
    }
    stages {
        stage('Preflight') {
            steps {
                echo sh(returnStdout: true, script: 'env')
                sh 'node -v'
                sh 'npm --version'
                sh 'git log --reverse -1'
            }
        }
        stage('Init') {
            steps {
                sh 'rm -f package-lock.json'
                sh 'rm -rf node_modules/'
                sh 'npm run init'
            }
        }
        stage('Build') {
            steps {
                sh 'mkdir -p ../node.js_Build'
                sh 'wget -O ../node.js_Build/funcs.js https://raw.githubusercontent.com/Kiuryy/node.js_Build/master/funcs.js'
                sh 'npm run release'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: '*.zip'
            emailext subject: '$DEFAULT_SUBJECT',
                    body: '''${SCRIPT, template="report.template"}''',
                    from: 'jenkins@redeviation.com',
                    to: '$DEFAULT_RECIPIENTS'
        }
    }
}