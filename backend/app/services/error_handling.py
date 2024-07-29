class AIServiceTimeout(Exception):
    pass

class TransientAIServiceError(Exception):
    pass

class UnrecoverableAIServiceError(Exception):
    pass