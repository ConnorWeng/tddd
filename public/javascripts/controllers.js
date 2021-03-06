var tdddControllers = angular.module('tdddControllers', ['ngSanitize', 'ui.bootstrap.modal']);

tdddControllers.controller('gitlabCtrl', ['$scope', '$location', 'repos', 'commits', 'tree', function($scope, $location, repos, commits, tree) {
  $scope.getRepo = function() {
    repos.get({
      repoUrl: $scope.repoUrl,
      privateKey: $scope.privateKey
    }).$promise.then(function(repo) {
      $scope.repo = repo;
      return commits.query({
        privateKey: $scope.repo.encrypted_private_key,
        id: $scope.repo.id
      }).$promise;
    }).then(function(cmts) {
      $scope.sha = cmts[cmts.length - 1].short_id;
      return tree.query({
        privateKey: $scope.repo.encrypted_private_key,
        id: $scope.repo.id,
        sha: $scope.sha
      }).$promise;
    }).then(function(fileTree) {
      var files = [];
      for (var i = 0; i < fileTree.length; i++) {
        var file = fileTree[i];
        if (file.type === 'blob') {
          files.push(file);
        }
      }
      if (files.length > 1) {
        $scope.fileA = files[0].name;
        $scope.fileB = files[1].name;
      } else {
        $scope.fileA = 'trival';
        $scope.fileB = 'trival';
      }
    }).then(function() {
      $location.path('/gitlab/' + $scope.repo.encrypted_private_key +
                     '/repos/' + $scope.repo.id +
                     '/blobs/' + $scope.sha +
                     '/' + $scope.fileA +
                     '/' + $scope.fileB);
    }).catch(function(reason) {
      console.log(reason);
    });
  };
}]);

tdddControllers.controller('editorCtrl', ['$scope', '$routeParams', '$location', '$sce', 'files', 'commits', 'tree', 'diff', function($scope, $routeParams, $location, $sce, files, commits, tree, diff) {
  $scope.fileA = $scope.fileB = 'loading...';
  $scope.fileAPrevContent = $scope.fileBPrevContent = '';
  $scope.fileADiffLoading = $scope.fileBDiffLoading = false;
  $scope.state = 0;
  $scope.cmtMsg = '';
  fillCode('fileA');
  fillCode('fileB');

  var cmts = commits.query({
    privateKey: $routeParams.privateKey,
    id: $routeParams.id
  }, function() {
    for (var i = 0; i < cmts.length; i++) {
      var cmt = cmts[i];
      if (cmt.short_id === $routeParams.sha) {
        $scope.cmtMsg = cmt.title;
        $scope.state = (100 - parseInt(i * 100 / (cmts.length - 1))).toString() + '%';
        if (i - 1 > -1) {
          $scope.next = '/#' + $location.url().replace($routeParams.sha, cmts[i-1].short_id);
        }
        if (i + 1 < cmts.length) {
          $scope.prev = '/#' + $location.url().replace($routeParams.sha, cmts[i+1].short_id);
        }
        break;
      }
    }
  });

  tree.query({
    privateKey: $routeParams.privateKey,
    id: $routeParams.id,
    sha: $routeParams.sha
  }).$promise.then(function(tree) {
    var filePaths = [];
    for(var i = 0; i < tree.length; i++) {
      var file = tree[i];
      filePaths.push(file.name);
    }
    $scope.filePaths = filePaths;
    $scope.filePathA = $routeParams.fileA;
    $scope.filePathB = $routeParams.fileB;
  });

  $scope.switchFile = function() {
    $location.url('/gitlab/' + $routeParams.privateKey +
                  '/repos/' + $routeParams.id +
                  '/blobs/' + $routeParams.sha +
                  '/' + $scope.filePathA +
                  '/' + $scope.filePathB);
  };

  function fillCode(whichFile) {
    var file = files.get({
      privateKey: $routeParams.privateKey,
      id: $routeParams.id,
      sha: $routeParams.sha,
      filePath: $routeParams[whichFile]
    }, function() {
      $scope[whichFile] = $sce.trustAsHtml(file.content);
    });
  }

  $scope.msgPos = function() {
    if (parseInt($scope.state) > 90) {
      return 'right:0';
    } else {
      return 'left:' + $scope.state;
    }
  };

  $scope.switchDiff = function(whichFile) {
    if ($scope[whichFile + 'DiffLoading']) {
      return;
    }
    var prevContent = $scope[whichFile + 'PrevContent'];
    if (prevContent) {
      $scope[whichFile + 'PrevContent'] = $scope[whichFile];
      $scope[whichFile] = prevContent;
    } else {
      $scope[whichFile + 'DiffLoading'] = true;
      var fileWithDiff = diff.get({
        privateKey: $routeParams.privateKey,
        id: $routeParams.id,
        sha: $routeParams.sha,
        filePath: $routeParams[whichFile]
      }, function(file) {
        $scope[whichFile + 'DiffLoading'] = false;
        $scope[whichFile + 'PrevContent'] = $scope[whichFile];
        $scope[whichFile] = $sce.trustAsHtml(file.content);
      });
    }
  };
}]);

tdddApp.controller('listCtrl', ['$scope', '$modal', 'problem', function($scope, $modal, problem) {
  problem.query(function(problems) {
    $scope.problems = problems;
  });

  $scope.addProblem = function() {
    var modalInstance = $modal.open({
      templateUrl: 'templates/problemform',
      controller: 'problemFormCtrl'
    });
    modalInstance.result.then(function(problem) {
      $scope.problems.push(problem);
    });
  };
}]);

tdddApp.controller('problemFormCtrl', ['$scope', '$modalInstance', 'problem', function($scope, $modalInstance, problem) {
  $scope.addProblem = function() {
    var newProblem = {title: $scope.title, desc: $scope.desc};
    problem.save(void 0, newProblem, function(reply) {
      $modalInstance.close(newProblem);
    }, function(reason) {
      alert(reason.message);
    });
  };
}]);

tdddApp.controller('solutionFormCtrl', ['$scope', '$modalInstance', 'solution', function($scope, $modalInstance, solution) {
  $scope.addSolution = function() {
    var newSolution = {
      id: 'problem:' + $scope.problem.id,
      title: $scope.title,
      author: $scope.author,
      link: $scope.link
    };
    solution.save(void 0, newSolution, function(reply) {
      $modalInstance.close(newSolution);
    }, function(reason) {
      alert(reason.message);
    });
  };
}]);

tdddApp.controller('problemCtrl', ['$scope', '$routeParams', '$modal', 'problem', 'solution', function($scope, $routeParams, $modal, problem, solution) {
  $scope.problem = problem.get({id:$routeParams.id});
  $scope.solutions = solution.query({id:$routeParams.id});

  $scope.addSolution = function() {
    var modalInstance = $modal.open({
      templateUrl: 'templates/solutionform',
      controller: 'solutionFormCtrl',
      scope: $scope
    });
    modalInstance.result.then(function(solution) {
      $scope.solutions.push(solution);
    });
  };
}]);
